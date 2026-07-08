import type { AgentExecutionContext } from "@pcc/schemas";
import { RetrievalOutput } from "@pcc/schemas";
import type { PropertyContext } from "@pcc/property-context";

export interface RetrievalInput {
  message: string;
  propertyContext: PropertyContext;
}

// Deliberately small and boring — this is a keyword-overlap placeholder (see file-level comment),
// not a real NLP stopword list. Its only job is to stop generic words ("can", "you", "offer") from
// producing false-positive matches; a real retrieval layer replaces this entirely.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "am", "was", "were", "be", "been", "being",
  "i", "you", "he", "she", "it", "we", "they", "me", "my", "your",
  "can", "could", "do", "does", "did", "have", "has", "had",
  "will", "would", "should", "may", "might", "must",
  "of", "in", "on", "at", "to", "for", "with", "about", "and", "or", "if",
  "please", "want", "like", "need", "get", "offer", "there",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((t) => !STOPWORDS.has(t));
}

// Directive §5.3: only status=VERIFIED + can_ai_answer=true are answerable; never invent facts.
// Deterministic keyword overlap against example_questions/intent — good enough for the demo
// scaffold's exact-FAQ cases; a real retrieval layer (vector or full-text) is a later build step.
export const retrievalAgent = {
  id: "knowledge-retrieval",

  async execute(input: RetrievalInput, _context: AgentExecutionContext): Promise<RetrievalOutput> {
    const queryTokens = new Set(tokenize(input.message));

    const scored = input.propertyContext.knowledgeBase
      .filter((item) => item.status === "VERIFIED" && item.can_ai_answer)
      .map((item) => {
        const haystack = [item.intent, item.category, ...item.example_questions].join(" ");
        const haystackTokens = new Set(tokenize(haystack));
        const overlap = [...queryTokens].filter((t) => haystackTokens.has(t)).length;
        return { item, overlap };
      })
      .filter(({ overlap }) => overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);

    const matched = scored.slice(0, 3).map(({ item }) => item);
    const topOverlap = scored[0]?.overlap ?? 0;
    const confidence = Math.min(1, topOverlap / Math.max(1, queryTokens.size));

    return RetrievalOutput.parse({
      matched_items: matched,
      source_ids: matched.map((item) => item.id),
      retrieval_confidence: confidence,
    });
  },
};
