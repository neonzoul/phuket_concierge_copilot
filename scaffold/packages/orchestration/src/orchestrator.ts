import { randomUUID } from "node:crypto";
import type { AgentExecutionContext, RequestObject, HandoffObject } from "@pcc/schemas";
import { runAgent, type RunAgentOptions } from "@pcc/agent-runtime";
import { appendEvent } from "@pcc/event-log";
import type { PropertyContext } from "@pcc/property-context";
import { safetyGuardAgent } from "@pcc/agent-safety-guard";
import { retrievalAgent } from "@pcc/agent-retrieval";
import { classifierAgent } from "@pcc/agent-classifier";
import { guestResponseAgent } from "@pcc/agent-guest-response";
import { verifierAgent } from "@pcc/agent-verifier";
import { requestCaptureAgent } from "@pcc/agent-request-capture";
import { humanHandoffAgent } from "@pcc/agent-human-handoff";

// Directive §9: orchestrator calls agents per the flow, passes data between them, enforces
// timeout/retry/fallback, writes the event log. It does NOT do business reasoning, write prompts,
// or generate guest-facing text — that all stays inside agents.

export interface AgentTimeouts {
  safetyGuard: RunAgentOptions;
  retrieval: RunAgentOptions;
  classifier: RunAgentOptions;
  guestResponse: RunAgentOptions;
  verifier: RunAgentOptions;
  requestCapture: RunAgentOptions;
  humanHandoff: RunAgentOptions;
}

export interface ProcessMessageInput {
  message: string;
  guestId?: string;
  guestName?: string;
  conversationId?: string;
  propertyContext: PropertyContext;
  providedFields?: Record<string, unknown>;
}

export type ProcessMessageResult =
  | { state: "ANSWER"; responseText: string; citedKnowledgeIds: string[] }
  | { state: "UNKNOWN"; responseText: string }
  | { state: "CONFIRM"; responseText: string; request: RequestObject }
  | { state: "HUMAN"; responseText: string; handoff: HandoffObject };

const UNKNOWN_TEMPLATE =
  "I do not have confirmed information about that, so I do not want to give you the wrong answer. I can ask the team to confirm.";

const HUMAN_TEMPLATE =
  "I am sorry you are dealing with this. I do not want to give unsafe advice or make a promise I can't keep. I will pass this to our team for direct support.";

export function createOrchestrator(timeouts: AgentTimeouts) {
  async function processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult> {
    const traceId = randomUUID();
    const context: AgentExecutionContext = {
      traceId,
      conversationId: input.conversationId,
      guestId: input.guestId,
      propertyId: input.propertyContext.propertyConfig.property_id as string,
      actorType: "guest",
      agentConfigVersion: "1.0.0",
      promptVersion: "v1",
      startedAt: new Date().toISOString(),
    };

    const safetyResult = await runAgent(
      safetyGuardAgent,
      { message: input.message, propertyContext: input.propertyContext },
      context,
      timeouts.safetyGuard
    );

    if (safetyResult.matched && safetyResult.behavior_state === "HUMAN") {
      const handoff = await runAgent(
        humanHandoffAgent,
        {
          safetyResult,
          summary: `Guest message: "${input.message}"`,
          guestId: input.guestId,
          relatedRequestId: null,
          propertyContext: input.propertyContext,
        },
        context,
        timeouts.humanHandoff
      );
      logBehaviorState(traceId, "HUMAN", input.message);
      return { state: "HUMAN", responseText: HUMAN_TEMPLATE, handoff };
    }

    const retrieval = await runAgent(
      retrievalAgent,
      { message: input.message, propertyContext: input.propertyContext },
      context,
      timeouts.retrieval
    );

    const classification = await runAgent(
      classifierAgent,
      { message: input.message, retrieval, propertyContext: input.propertyContext },
      context,
      timeouts.classifier
    );

    switch (classification.behavior_state) {
      case "UNKNOWN": {
        logBehaviorState(traceId, "UNKNOWN", input.message);
        return { state: "UNKNOWN", responseText: UNKNOWN_TEMPLATE };
      }

      case "CONFIRM": {
        const request = await runAgent(
          requestCaptureAgent,
          {
            serviceId: classification.intent as string,
            guestId: input.guestId,
            guestName: input.guestName,
            providedFields: input.providedFields ?? {},
            sourceMessageId: traceId,
            propertyContext: input.propertyContext,
          },
          context,
          timeouts.requestCapture
        );
        logBehaviorState(traceId, "CONFIRM", input.message);
        return {
          state: "CONFIRM",
          responseText:
            request.missing_fields.length > 0
              ? `I can request that for you. I still need: ${request.missing_fields.join(", ")}. Our team will confirm before anything is final.`
              : "I can request that for you. Our team will confirm before anything is final.",
          request,
        };
      }

      case "HUMAN": {
        const handoff = await runAgent(
          humanHandoffAgent,
          {
            safetyResult: {
              matched: true,
              risk_category: classification.intent,
              risk_level: "MEDIUM",
              behavior_state: "HUMAN",
              priority: "NORMAL",
              handoff_team: "guest_relations",
              reason: classification.reason,
            },
            summary: `Guest message: "${input.message}"`,
            guestId: input.guestId,
            relatedRequestId: null,
            propertyContext: input.propertyContext,
          },
          context,
          timeouts.humanHandoff
        );
        logBehaviorState(traceId, "HUMAN", input.message);
        return { state: "HUMAN", responseText: HUMAN_TEMPLATE, handoff };
      }

      case "ANSWER":
      default: {
        const response = await runAgent(
          guestResponseAgent,
          { knowledgeItems: retrieval.matched_items },
          context,
          timeouts.guestResponse
        );
        const verification = await runAgent(
          verifierAgent,
          { response, citedItems: retrieval.matched_items },
          context,
          timeouts.verifier
        );

        if (!verification.pass) {
          logBehaviorState(traceId, "UNKNOWN", input.message);
          return { state: "UNKNOWN", responseText: UNKNOWN_TEMPLATE };
        }

        logBehaviorState(traceId, "ANSWER", input.message);
        return {
          state: "ANSWER",
          responseText: response.response_text,
          citedKnowledgeIds: response.cited_knowledge_ids,
        };
      }
    }
  }

  return { processMessage };
}

function logBehaviorState(traceId: string, state: string, message: string): void {
  appendEvent({
    event_id: randomUUID(),
    trace_id: traceId,
    actor_type: "system",
    agent_id: null,
    event_type: `behavior_state.${state.toLowerCase()}`,
    payload: { message },
    created_at: new Date().toISOString(),
  });
}
