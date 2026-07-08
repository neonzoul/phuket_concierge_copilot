import type { AgentExecutionContext, HandoffObject, RequestObject } from "@pcc/schemas";
import { GuestBrief } from "@pcc/schemas";

export interface MitriGuestBriefInput {
  guestId: string;
  guestName: string;
  stay?: Record<string, unknown>;
  preferences: string[];
  sensitiveNotes: string[];
  requests: RequestObject[];
  handoffs: HandoffObject[];
  sourceEventIds: string[];
}

// Directive §5.8: regenerates only on defined trigger events (preference/request/handoff/stay/
// staff-note change) — the orchestrator decides when to call this, not the agent itself.
export const mitriGuestBriefAgent = {
  id: "mitri-guest-brief",

  async execute(input: MitriGuestBriefInput, _context: AgentExecutionContext): Promise<GuestBrief> {
    const openHandoffs = input.handoffs.filter((h) => h.status !== "resolved");
    const recommendedActions = openHandoffs.map(
      (h) => `${h.assigned_team}: ${h.required_action}`
    );

    return GuestBrief.parse({
      guest_id: input.guestId,
      guest_name: input.guestName,
      stay: input.stay,
      preferences: input.preferences,
      active_requests: input.requests
        .filter((r) => r.status === "pending_confirmation")
        .map((r) => r.request_id),
      open_handoffs: openHandoffs.map((h) => h.handoff_id),
      sensitive_items: input.sensitiveNotes,
      recommended_human_actions: recommendedActions,
      source_event_ids: input.sourceEventIds,
      generated_at: new Date().toISOString(),
    });
  },
};
