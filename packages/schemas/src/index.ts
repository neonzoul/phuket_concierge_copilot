// Shared, versioned schemas — every agent input/output is validated against one of these.
// Directive §14 rule #2: typed input/output for every agent. No agent invents its own shape.

import { z } from "zod";

// ---- Product behavior state (directive §15) ----
export const BehaviorState = z.enum(["ANSWER", "CONFIRM", "HUMAN", "UNKNOWN"]);
export type BehaviorState = z.infer<typeof BehaviorState>;

export const RiskLevel = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

// HUMAN is not equal to URGENT (directive §15) — priority is a separate axis.
export const Priority = z.enum(["NORMAL", "HIGH", "URGENT"]);
export type Priority = z.infer<typeof Priority>;

export const KnowledgeStatus = z.enum(["VERIFIED", "NEEDS_REVIEW", "ARCHIVED"]);
export type KnowledgeStatus = z.infer<typeof KnowledgeStatus>;

// ---- Agent execution context (directive §8) ----
export const AgentExecutionContext = z.object({
  traceId: z.string(),
  conversationId: z.string().optional(),
  guestId: z.string().optional(),
  propertyId: z.string(),
  actorType: z.enum(["guest", "staff", "system"]),
  agentConfigVersion: z.string(),
  promptVersion: z.string(),
  startedAt: z.string(),
});
export type AgentExecutionContext = z.infer<typeof AgentExecutionContext>;

// ---- Property context data shapes (directive §5 / demo data pack) ----
export const KnowledgeItem = z.object({
  id: z.string(),
  property_id: z.string(),
  category: z.string(),
  intent: z.string(),
  example_questions: z.array(z.string()).default([]),
  verified_answer: z.string(),
  source: z.string(),
  source_owner: z.string(),
  updated_at: z.string(),
  status: KnowledgeStatus,
  can_ai_answer: z.boolean(),
  needs_confirmation: z.boolean(),
  risk_level: RiskLevel,
  handoff_team: z.string().nullable(),
  notes: z.string().optional().default(""),
  data_label: z.string().optional(),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItem>;

export const ServiceDefinition = z.object({
  service_id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
  price: z.unknown().nullable().optional(),
  requires_confirmation: z.boolean(),
  required_fields: z.array(z.string()),
  assigned_team: z.string(),
  behavior_state: BehaviorState,
  safety_note: z.string().optional(),
});
export type ServiceDefinition = z.infer<typeof ServiceDefinition>;

export const HandoffRule = z.object({
  rule_id: z.string(),
  risk_category: z.string(),
  trigger_examples: z.array(z.string()),
  risk_level: RiskLevel,
  behavior_state: BehaviorState,
  handoff_team: z.string(),
  priority: Priority,
  required_action: z.string(),
  active: z.boolean(),
});
export type HandoffRule = z.infer<typeof HandoffRule>;

export const StaffRole = z.object({
  role_id: z.string(),
  display_name: z.string(),
  responsibilities: z.array(z.string()),
  ack_target_minutes: z.number(),
  demo_contact: z.string(),
});
export type StaffRole = z.infer<typeof StaffRole>;

export const SensitiveNote = z.object({
  type: z.string(),
  summary: z.string(),
  data_minimized: z.boolean(),
  requires_human_review: z.boolean(),
});
export type SensitiveNote = z.infer<typeof SensitiveNote>;

export const Guest = z.object({
  guest_id: z.string(),
  full_name: z.string(),
  nationality: z.string(),
  preferred_language: z.string(),
  contact: z.object({
    email: z.string(),
    phone: z.string().optional(),
  }),
  preferences: z.array(z.string()).default([]),
  purpose_of_stay: z.string(),
  sensitive_notes: z.array(SensitiveNote).default([]),
});
export type Guest = z.infer<typeof Guest>;

export const Stay = z.object({
  stay_id: z.string(),
  guest_id: z.string(),
  property_id: z.string(),
  booking_name: z.string(),
  suite_type: z.string(),
  arrival_date: z.string(),
  departure_date: z.string(),
  arrival_time: z.string(),
  status: z.string(),
  booking_lookup_source: z.string(),
});
export type Stay = z.infer<typeof Stay>;

// ---- Agent outputs ----
export const SafetyGuardOutput = z.object({
  matched: z.boolean(),
  risk_category: z.string().nullable(),
  risk_level: RiskLevel.nullable(),
  behavior_state: BehaviorState.nullable(),
  priority: Priority.nullable(),
  handoff_team: z.string().nullable(),
  reason: z.string(),
});
export type SafetyGuardOutput = z.infer<typeof SafetyGuardOutput>;

export const ClassifierOutput = z.object({
  behavior_state: BehaviorState,
  intent: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  required_next_action: z.string(),
  missing_fields: z.array(z.string()).default([]),
});
export type ClassifierOutput = z.infer<typeof ClassifierOutput>;

export const RetrievalOutput = z.object({
  matched_items: z.array(KnowledgeItem),
  source_ids: z.array(z.string()),
  retrieval_confidence: z.number().min(0).max(1),
});
export type RetrievalOutput = z.infer<typeof RetrievalOutput>;

export const GuestResponseOutput = z.object({
  response_text: z.string(),
  cited_knowledge_ids: z.array(z.string()),
  claims: z.array(z.string()),
  suggested_next_step: z.string().nullable(),
});
export type GuestResponseOutput = z.infer<typeof GuestResponseOutput>;

export const VerificationOutput = z.object({
  pass: z.boolean(),
  unsupported_claims: z.array(z.string()),
  prohibited_phrasing: z.array(z.string()),
  corrected_state: BehaviorState.nullable(),
  fallback_instruction: z.string().nullable(),
});
export type VerificationOutput = z.infer<typeof VerificationOutput>;

export const RequestObject = z.object({
  request_id: z.string(),
  type: z.string(),
  status: z.enum(["pending_confirmation", "confirmed", "declined"]),
  guest_id: z.string().optional(),
  guest_name: z.string().optional(),
  fields: z.record(z.string(), z.unknown()),
  missing_fields: z.array(z.string()),
  assigned_team: z.string(),
  source_message_ids: z.array(z.string()),
  created_at: z.string(),
});
export type RequestObject = z.infer<typeof RequestObject>;

export const HandoffObject = z.object({
  handoff_id: z.string(),
  reason: z.string(),
  summary: z.string(),
  priority: Priority,
  assigned_team: z.string(),
  required_action: z.string(),
  related_request_id: z.string().nullable(),
  guest_id: z.string().optional(),
  ack_target_minutes: z.number().optional(),
  created_at: z.string(),
  status: z.enum(["open", "acknowledged", "resolved"]),
});
export type HandoffObject = z.infer<typeof HandoffObject>;

export const GuestBrief = z.object({
  guest_id: z.string(),
  guest_name: z.string(),
  stay: z.record(z.string(), z.unknown()).optional(),
  preferences: z.array(z.string()).default([]),
  active_requests: z.array(z.string()).default([]),
  open_handoffs: z.array(z.string()).default([]),
  sensitive_items: z.array(z.string()).default([]),
  recommended_human_actions: z.array(z.string()).default([]),
  source_event_ids: z.array(z.string()).default([]),
  generated_at: z.string(),
});
export type GuestBrief = z.infer<typeof GuestBrief>;

export const OwnerInsight = z.object({
  data_label: z.literal("Demo Data — Not Actual Client Information"),
  period: z.string(),
  metrics: z.record(z.string(), z.unknown()),
  notable_patterns: z.array(z.string()),
  knowledge_gaps: z.array(z.string()),
  operational_observations: z.array(z.string()),
  recommendations: z.array(z.string()),
  generated_at: z.string(),
});
export type OwnerInsight = z.infer<typeof OwnerInsight>;

// ---- Event log (append-only — directive §4/§9) ----
export const EventLogEntry = z.object({
  event_id: z.string(),
  trace_id: z.string(),
  actor_type: z.enum(["guest", "staff", "system", "ai"]),
  agent_id: z.string().nullable(),
  event_type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export type EventLogEntry = z.infer<typeof EventLogEntry>;
