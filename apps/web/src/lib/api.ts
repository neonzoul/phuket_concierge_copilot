export type BehaviorState = "ANSWER" | "CONFIRM" | "HUMAN" | "UNKNOWN";

export interface SendMessageInput {
  message: string;
  guestId?: string;
  guestName?: string;
  conversationId?: string;
  providedFields?: Record<string, unknown>;
}

export interface SendMessageResponse {
  state: BehaviorState;
  responseText: string;
  citedKnowledgeIds?: string[];
  request?: { request_id: string; status: string; missing_fields: string[] };
  handoff?: { handoff_id: string; assigned_team: string; priority: string };
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  const res = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Guest message request failed (${res.status})`);
  }

  return res.json();
}
