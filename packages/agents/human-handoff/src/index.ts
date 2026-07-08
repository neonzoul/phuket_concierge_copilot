import { randomUUID } from "node:crypto";
import type { AgentExecutionContext, SafetyGuardOutput } from "@pcc/schemas";
import { HandoffObject } from "@pcc/schemas";
import type { PropertyContext } from "@pcc/property-context";

export interface HumanHandoffInput {
  safetyResult: SafetyGuardOutput;
  summary: string;
  guestId?: string;
  relatedRequestId?: string | null;
  propertyContext: PropertyContext;
}

// Directive §5.7 hard rule: handoff must contain prepared context, not only raw chat.
// HUMAN is not equal to URGENT (directive §15) — priority comes from the matched rule, not from
// the fact that a handoff was created.
export const humanHandoffAgent = {
  id: "human-handoff",

  async execute(input: HumanHandoffInput, _context: AgentExecutionContext): Promise<HandoffObject> {
    const role = input.propertyContext.staffRoles.find(
      (r) => r.role_id === input.safetyResult.handoff_team
    );

    return HandoffObject.parse({
      handoff_id: randomUUID(),
      reason: input.safetyResult.risk_category ?? "unspecified",
      summary: input.summary,
      priority: input.safetyResult.priority ?? "NORMAL",
      assigned_team: input.safetyResult.handoff_team ?? "guest_relations",
      required_action: input.safetyResult.reason,
      related_request_id: input.relatedRequestId ?? null,
      guest_id: input.guestId,
      ack_target_minutes: role?.ack_target_minutes,
      created_at: new Date().toISOString(),
      status: "open",
    });
  },
};
