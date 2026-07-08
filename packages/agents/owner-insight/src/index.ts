import type { AgentExecutionContext, EventLogEntry } from "@pcc/schemas";
import { OwnerInsight } from "@pcc/schemas";

export interface OwnerInsightInput {
  events: EventLogEntry[];
}

// Directive §5.9: generate on demand, no scheduler required before a real pilot.
export const ownerInsightAgent = {
  id: "owner-insight",

  async execute(input: OwnerInsightInput, _context: AgentExecutionContext): Promise<OwnerInsight> {
    const byType = input.events.reduce<Record<string, number>>((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    }, {});

    const unknownEvents = input.events.filter((e) => e.event_type === "behavior_state.unknown");
    const knowledgeGaps = [...new Set(unknownEvents.map((e) => String(e.payload.message ?? "")))].filter(
      Boolean
    );

    return OwnerInsight.parse({
      data_label: "Demo Data — Not Actual Client Information",
      period: "session-to-date",
      metrics: byType,
      notable_patterns: [],
      knowledge_gaps: knowledgeGaps,
      operational_observations: [],
      recommendations: knowledgeGaps.length
        ? ["Review recurring UNKNOWN questions and consider adding them to the knowledge base."]
        : [],
      generated_at: new Date().toISOString(),
    });
  },
};
