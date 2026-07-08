import { randomUUID } from "node:crypto";
import type { EventLogEntry } from "@pcc/schemas";
import { appendEvent } from "@pcc/event-log";
import type { Agent, AgentExecutionContext, RunAgentOptions } from "./types.js";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Agent timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// The ONLY place agents get invoked from (directive §14 rule #11/#12 — no agent calls another
// agent directly; all agent calls go through the runtime). Enforces timeout/retry/fallback and
// writes an event-log entry for every attempt (directive §14 rule #13).
export async function runAgent<TInput, TOutput>(
  agent: Agent<TInput, TOutput>,
  input: TInput,
  context: AgentExecutionContext,
  options: RunAgentOptions
): Promise<TOutput> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      const output = await withTimeout(agent.execute(input, context), options.timeoutMs);
      logEvent(agent.id, context, "agent.success", { attempt, output });
      return output;
    } catch (error) {
      lastError = error;
      logEvent(agent.id, context, "agent.error", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const fallback = options.fallback() as TOutput;
  logEvent(agent.id, context, "agent.fallback", {
    reason: lastError instanceof Error ? lastError.message : String(lastError),
    fallback,
  });
  return fallback;
}

function logEvent(
  agentId: string,
  context: AgentExecutionContext,
  eventType: string,
  payload: Record<string, unknown>
): void {
  const entry: EventLogEntry = {
    event_id: randomUUID(),
    trace_id: context.traceId,
    actor_type: "ai",
    agent_id: agentId,
    event_type: eventType,
    payload,
    created_at: new Date().toISOString(),
  };
  appendEvent(entry);
}

export type { Agent, AgentExecutionContext, RunAgentOptions };
