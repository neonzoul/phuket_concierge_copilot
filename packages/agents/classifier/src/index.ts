import type { AgentExecutionContext, RetrievalOutput } from "@pcc/schemas";
import { ClassifierOutput } from "@pcc/schemas";
import type { PropertyContext } from "@pcc/property-context";

export interface ClassifierInput {
  message: string;
  retrieval: RetrievalOutput;
  propertyContext: PropertyContext;
}

// Same small stopword list as the retrieval agent (kept local — this is a keyword-overlap
// placeholder, not real NLP; a proper shared tokenizer is a later build step alongside real
// retrieval).
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

// Service names/ids share generic hospitality words ("request", "check", "stay", "room", "class")
// across many unrelated services — these need filtering out of the *service* haystack specifically
// (a genuine query token like "check" must not match "Late Check-out Request" by accident), while
// staying available to the knowledge-base retrieval agent's own tokenizer, which needs them.
const SERVICE_HAYSTACK_STOPWORDS = new Set([
  "request", "requests", "service", "services", "check", "stay", "room", "class", "booking",
  // "airport"/"checkout" collide with unrelated FAQs (travel-time question, luggage-storage
  // question) that share the word without asking to book anything. "private" is shared across
  // four unrelated services (two transfers, a driver, a boat cruise) and — since service matching
  // takes the first array hit — was always resolving to whichever service happened to be listed
  // first, never a real signal of intent.
  "airport", "checkout", "private",
]);

function tokenizeServiceHaystack(text: string): string[] {
  return tokenize(text).filter((t) => !SERVICE_HAYSTACK_STOPWORDS.has(t));
}

// Directive §5.2 hard rule: must not generate the guest-facing answer itself — only classifies.
export const classifierAgent = {
  id: "behavior-classifier",

  async execute(input: ClassifierInput, _context: AgentExecutionContext): Promise<ClassifierOutput> {
    // Service-menu match is checked FIRST: a message like "can I book the morning yoga class?"
    // will also keyword-overlap a wellness FAQ item, but a booking request must become a
    // structured CONFIRM, not a free ANSWER — the guardrails require CONFIRM for anything the
    // team must approve (directive §2 hard rule: "no autonomous booking confirmation").
    const queryTokens = new Set(tokenize(input.message));
    const service = input.propertyContext.serviceMenu.find((svc) => {
      const haystack = tokenizeServiceHaystack(`${svc.name} ${svc.service_id} ${svc.category}`);
      return haystack.some((t) => queryTokens.has(t));
    });

    if (service) {
      return ClassifierOutput.parse({
        behavior_state: "CONFIRM",
        intent: service.service_id,
        confidence: 0.6,
        reason: `Message matches service "${service.name}".`,
        required_next_action: "Capture structured request and collect missing required fields.",
        missing_fields: service.required_fields,
      });
    }

    // Exact/near-exact FAQ match with real evidence → ANSWER. Strictly greater than 0.5, not
    // >=: a single shared word between a short query and a short FAQ example (e.g. "pay" in both
    // "Can I pay with Bitcoin?" and "Can I pay by card?") lands exactly at 0.5 and is not reliable
    // enough evidence on its own — see UNK-003 in tests/fixtures/acceptance_test_matrix.csv.
    if (input.retrieval.matched_items.length > 0 && input.retrieval.retrieval_confidence > 0.5) {
      return ClassifierOutput.parse({
        behavior_state: "ANSWER",
        intent: input.retrieval.matched_items[0].intent,
        confidence: input.retrieval.retrieval_confidence,
        reason: "Verified knowledge item matched with sufficient confidence.",
        required_next_action: "Generate guest-facing answer from cited knowledge item.",
        missing_fields: [],
      });
    }

    // No verified evidence, no service match → UNKNOWN. Never guess (directive §2 hard rule).
    return ClassifierOutput.parse({
      behavior_state: "UNKNOWN",
      intent: null,
      confidence: 0,
      reason: "No verified knowledge or service match found.",
      required_next_action: "Return a no-guess response and offer staff confirmation.",
      missing_fields: [],
    });
  },
};
