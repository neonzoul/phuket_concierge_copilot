import type { AgentExecutionContext, KnowledgeItem } from "@pcc/schemas";
import { GuestResponseOutput } from "@pcc/schemas";

export interface GuestResponseInput {
  knowledgeItems: KnowledgeItem[];
  suggestedNextStep?: string | null;
}

// Directive §5.4 hard rules: no unsupported claim, no final confirmation without a human
// confirmation event, no medical/legal advice. This scaffold answers from the top cited item
// verbatim (deterministic, demo-safe) rather than paraphrasing with an LLM by default — directive
// §17: exact FAQ answers should not require an LLM call.
export const guestResponseAgent = {
  id: "guest-response",

  async execute(input: GuestResponseInput, _context: AgentExecutionContext): Promise<GuestResponseOutput> {
    const top = input.knowledgeItems[0];
    if (!top) {
      throw new Error("guest-response called with no knowledge items — orchestrator routing bug");
    }

    return GuestResponseOutput.parse({
      response_text: top.verified_answer,
      cited_knowledge_ids: [top.id],
      claims: [top.verified_answer],
      suggested_next_step: input.suggestedNextStep ?? null,
    });
  },
};
