// Single source of truth for every agent's model/prompt/timeout/retry/fallback config
// (directive §6). Hard rule: no agent implementation file may hardcode a model name, prompt
// path, timeout, temperature, or retry count — everything comes from here.

import { join } from "node:path";
import type { AgentRuntimeConfig } from "@pcc/llm-providers";

const PROMPTS_ROOT = join(process.cwd(), "prompts");

export const agentRegistry = {
  safetyGuard: {
    id: "safety-guard",
    enabled: true,
    purpose: "Detect high-risk and human-required topics before other agents run.",
    provider: "mock", // deterministic rules today (directive §5.1); flip to "anthropic" for ambiguous-case escalation
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 5000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "safety-guard", "v1.md"),
    version: "1.0.0",
  },
  classifier: {
    id: "behavior-classifier",
    enabled: true,
    purpose: "Classify guest messages into ANSWER, CONFIRM, HUMAN, or UNKNOWN.",
    provider: "mock",
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 600,
    timeoutMs: 5000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "classifier", "v1.md"),
    version: "1.0.0",
  },
  retrieval: {
    id: "knowledge-retrieval",
    enabled: true,
    purpose: "Retrieve verified knowledge items relevant to the guest message.",
    provider: "mock",
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 5000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "classifier", "v1.md"), // no dedicated prompt yet — deterministic
    version: "1.0.0",
  },
  responder: {
    id: "guest-response",
    enabled: true,
    purpose: "Generate guest-facing responses from verified evidence only.",
    provider: "mock",
    model: "claude-sonnet-4-6",
    temperature: 0.2,
    maxTokens: 1000,
    timeoutMs: 8000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "guest-response", "v1.md"),
    version: "1.0.0",
  },
  verifier: {
    id: "response-verifier",
    enabled: true,
    purpose: "Verify a generated response is fully traceable to cited knowledge before sending.",
    provider: "mock",
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 400,
    timeoutMs: 4000,
    retries: 0,
    promptPath: join(PROMPTS_ROOT, "verifier", "v1.md"),
    version: "1.0.0",
  },
  requestCapture: {
    id: "request-capture",
    enabled: true,
    purpose: "Turn a guest conversation into a structured request.",
    provider: "mock",
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 5000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "classifier", "v1.md"), // deterministic, no dedicated prompt yet
    version: "1.0.0",
  },
  humanHandoff: {
    id: "human-handoff",
    enabled: true,
    purpose: "Build a staff-ready handoff with prepared context.",
    provider: "mock",
    model: "claude-haiku-4-5-20251001",
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 5000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "classifier", "v1.md"), // deterministic, no dedicated prompt yet
    version: "1.0.0",
  },
  mitriGuestBrief: {
    id: "mitri-guest-brief",
    enabled: true,
    purpose: "Compose a one-page staff-ready guest brief, readable in 15-20 seconds.",
    provider: "mock",
    model: "claude-sonnet-4-6",
    temperature: 0,
    maxTokens: 800,
    timeoutMs: 6000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "mitri-guest-brief", "v1.md"),
    version: "1.0.0",
  },
  ownerInsight: {
    id: "owner-insight",
    enabled: true,
    purpose: "Generate an owner-level report readable in under 3 minutes, on demand.",
    provider: "mock",
    model: "claude-sonnet-4-6",
    temperature: 0,
    maxTokens: 1200,
    timeoutMs: 8000,
    retries: 1,
    promptPath: join(PROMPTS_ROOT, "owner-insight", "v1.md"),
    version: "1.0.0",
  },
} as const satisfies Record<string, AgentRuntimeConfig & { enabled: boolean; purpose: string; version: string }>;

export type AgentRegistryKey = keyof typeof agentRegistry;
