// Tool permission model (directive §10). No agent gets a database client that can write every
// table — each agent's allowlist is declared here, checked by the orchestrator/runtime, not by
// the agent itself.

export const toolsRegistry = {
  "safety-guard": { readKb: false, writeRequest: false, writeHandoff: false, readGuest: false, writeGuestBrief: false, sendNotification: false },
  "behavior-classifier": { readKb: "metadata_only", writeRequest: false, writeHandoff: false, readGuest: false, writeGuestBrief: false, sendNotification: false },
  "knowledge-retrieval": { readKb: true, writeRequest: false, writeHandoff: false, readGuest: false, writeGuestBrief: false, sendNotification: false },
  "guest-response": { readKb: "supplied_evidence_only", writeRequest: false, writeHandoff: false, readGuest: "context_only", writeGuestBrief: false, sendNotification: false },
  "response-verifier": { readKb: "supplied_evidence_only", writeRequest: false, writeHandoff: false, readGuest: false, writeGuestBrief: false, sendNotification: false },
  "request-capture": { readKb: "service_definitions", writeRequest: true, writeHandoff: false, readGuest: true, writeGuestBrief: false, sendNotification: false },
  "human-handoff": { readKb: "routing_rules", writeRequest: false, writeHandoff: true, readGuest: true, writeGuestBrief: false, sendNotification: true },
  "mitri-guest-brief": { readKb: true, writeRequest: "read_only", writeHandoff: "read_only", readGuest: true, writeGuestBrief: true, sendNotification: false },
  "owner-insight": { readKb: "aggregate_only", writeRequest: false, writeHandoff: false, readGuest: "anonymized_aggregate", writeGuestBrief: false, sendNotification: false },
} as const;

export type ToolsRegistryKey = keyof typeof toolsRegistry;
