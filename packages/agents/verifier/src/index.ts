import type { AgentExecutionContext, GuestResponseOutput, KnowledgeItem } from "@pcc/schemas";
import { VerificationOutput } from "@pcc/schemas";

export interface VerifierInput {
  response: GuestResponseOutput;
  citedItems: KnowledgeItem[];
}

const PROHIBITED_PHRASES = [
  "guaranteed",
  "100% safe",
  "confirmed booking",
  "definitely available",
  "best price",
];

// Directive §5.5: deterministic checks always; LLM verification only when needed. Confirms every
// claim traces to a cited, VERIFIED knowledge item and no forbidden phrasing slipped through.
export const verifierAgent = {
  id: "response-verifier",

  async execute(input: VerifierInput, _context: AgentExecutionContext): Promise<VerificationOutput> {
    const citedIds = new Set(input.citedItems.map((item) => item.id));
    const unsupportedClaims = input.response.cited_knowledge_ids.filter((id) => !citedIds.has(id));

    const lowerText = input.response.response_text.toLowerCase();
    const prohibitedPhrasing = PROHIBITED_PHRASES.filter((phrase) => lowerText.includes(phrase));

    const pass = unsupportedClaims.length === 0 && prohibitedPhrasing.length === 0;

    return VerificationOutput.parse({
      pass,
      unsupported_claims: unsupportedClaims,
      prohibited_phrasing: prohibitedPhrasing,
      corrected_state: pass ? null : "UNKNOWN",
      fallback_instruction: pass
        ? null
        : "Discard generated response; return the safe no-guess UNKNOWN template instead.",
    });
  },
};
