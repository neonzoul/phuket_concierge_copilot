---
type: spec
status: approved-with-amendments
lang: en
owner: agent
client: "001_anant_agent"
project: "PJ_phuket_concierge_copilot"
---

# Phuket Concierge Copilot — Architecture Proposal (Senior Engineer Agent Pass)

Sources:
- `backlog_files/phuket-concierge-copilot-build-pack/` — original build pack (product/PRD/guardrails/demo spec).
- `backlog_files/PHUKET_CONCIERGE_COPILOT_ARCHITECTURE_APPROVAL_MULTI_AGENT_DIRECTIVE_v1_0.md` —
  **client-approved amendment.** This directive is the current implementation authority and
  supersedes any conflicting detail in the v1 draft of this proposal (v1 history kept in git).
- `backlog_files/phuket_concierge_copilot_demo_data_pack_v1_0/` — approved synthetic business
  context (57 knowledge items, 13 services, 18 handoff rules, 40 acceptance tests) for the fictional
  demo property.

**Status: approved in principle, with amendments.** Scaffold may begin only after the six gating
deliverables in §9 are produced and reviewed (directive §20). No code has been written yet.

## 1. Product Ownership Clarification (corrects v1 assumption)

**ANANT AGENT is the product owner and commissioning client of the Phuket Concierge Copilot demo —
not a hotel or property client.** "Nai Harn Wellness Hideaway" and "Emma Williams" are approved
fictional fixtures for the Demo Build, owned end-to-end by the demo data pack. A real hotel/property
will only enter the picture later, through a separate **Client Pilot Discovery** process, once a real
pilot property signs on. Do not conflate ANANT AGENT with that future property client anywhere in
docs, code, or copy.

This corrects §2 of the prior draft, which treated "anant_agent" as if it were the property being
discovered. The discovery form drafted for that purpose has been relabeled — see
`discovery/discovery-form.md` (now: Client Pilot Discovery template, held for future use).

## 2. Understanding of the Product

Phuket Concierge Copilot is a guest-care AI layer for a boutique Phuket wellness property — not a
general chatbot. It answers verified routine questions, turns requests into structured work items,
stops for human judgment on sensitive topics, produces a one-page staff-ready guest brief ("Mitri"),
and produces owner-visible pilot evidence. Every message resolves to exactly one behavior state:
`ANSWER`, `CONFIRM`, `HUMAN`, or `UNKNOWN` (`HUMAN` overrides all; `UNKNOWN` overrides `ANSWER` when
evidence is insufficient). `HUMAN` is a separate axis from urgency — `HUMAN` is not automatically
`URGENT` (directive §15).

## 3. Approved Technology Stack (amends v1 defaults)

| Layer | v1 draft said | Directive locks |
|---|---|---|
| Frontend | Next.js/React | Next.js, React, **TypeScript**, App Router, Server Components by default, Client Components only where interaction requires it |
| Backend | FastAPI or Node | **Node.js, TypeScript, Fastify**, Zod for input/output validation, OpenAPI generated from route schemas |
| Database/Auth | Supabase/Postgres | Supabase Postgres + **Supabase Auth**; row-level security prepared but may stay minimal for demo |
| Hosting | Vercel + Railway/Render | Vercel (frontend), Railway (backend), Supabase (db/auth/storage) — **infra accounts owned by ANANT AGENT** |
| LLM | classifier + generator + verifier, vendor unspecified | **Anthropic Claude**, accessed only through a provider abstraction — no business logic imports the Anthropic SDK directly |
| Notification | Slack or Telegram mock | **Slack mock/demo adapter**; dashboard remains source of truth; adapters must be swappable |

## 4. Multi-Agent Architecture — Required From Day One (new, supersedes v1's single-pipeline sketch)

Core principle: **one orchestration layer coordinates small, specialized agents; each agent does one
job and returns a typed result.** No "God Agent" that classifies, retrieves, answers, writes
requests, creates handoffs, and summarizes in one prompt.

Every agent must have: a narrow purpose, an input schema, an output schema, a model config, a
versioned prompt, an explicit tool allowlist, a timeout/retry policy, a fallback behavior, and
observability/logging. No agent gets write access beyond what it's explicitly granted.

### Agent set (9 agents)

| Agent | Purpose | Hard rule |
|---|---|---|
| Safety Guard | Detect medical/legal/safety/security/refund/emergency topics before anything else runs | `HUMAN` overrides all; urgency is a separate field from `HUMAN` |
| Intent & Behavior Classifier | Classify message into `ANSWER/CONFIRM/HUMAN/UNKNOWN` | must not generate the guest-facing answer itself |
| Knowledge Retrieval | Retrieve from verified property sources | only `status=VERIFIED` + `can_ai_answer=true`; never invent missing facts |
| Guest Response | Generate the guest-facing answer from retrieved evidence | no unsupported claim; no final confirmation without a human confirmation event; no medical/legal advice |
| Response Verification | Check the generated response before sending | deterministic checks always; LLM verification only when needed; exact FAQ answers skip the extra LLM call |
| Request Capture | Turn conversation into a structured request | cannot confirm booking or set final availability; preserves source message ids |
| Human Handoff | Build a staff-ready handoff | must carry prepared context, not raw chat |
| Mitri Guest Brief | One-page staff brief, readable in 15–20s | regenerates only on defined trigger events (preference/request/handoff/stay/staff-note change) |
| Owner Insight | ≤3-minute owner report | generated on demand for P0; no scheduler required yet |

### Agent registry — single source of truth

One config file (`config/agents.registry.ts`) declares, per agent: id, enabled flag, purpose,
provider, model, temperature, max tokens, timeout, retries, prompt path, input/output schema names,
tool allowlist, fallback behavior, version. **No model name, prompt path, timeout, or retry count may
be hardcoded inside an agent's implementation file** — everything comes from the registry.

### Provider abstraction

```ts
export interface LLMProvider {
  generate<TInput, TOutput>(config: AgentRuntimeConfig, input: TInput): Promise<TOutput>;
}
```
Adapters live under `src/llm/providers/` (`anthropic.provider.ts`, `openai.provider.ts`,
`mock.provider.ts`). P0 uses the real Anthropic adapter plus a Mock provider for deterministic
test/demo runs. Business logic only ever calls `llmProvider.generate(...)`, never the Anthropic SDK
directly.

### Agent runtime interface

```ts
export interface Agent<TInput, TOutput> {
  id: string;
  execute(input: TInput, context: AgentExecutionContext): Promise<TOutput>;
}

export interface AgentExecutionContext {
  traceId: string;
  conversationId?: string;
  guestId?: string;
  propertyId: string;
  actorType: "guest" | "staff" | "system";
  agentConfigVersion: string;
  promptVersion: string;
  startedAt: string;
}
```

### Orchestrator

Calls agents per the flow below, passes data between them, enforces timeout/retry/fallback, and
writes the event log. It does **not** reason about business logic, write prompts, or generate
guest-facing text itself — that stays inside agents.

```
Incoming Message
  → Normalize Input
  → Safety Guard Agent
      ├─ HUMAN → Human Handoff Agent → Guest Safe Response
      └─ Continue
           → Knowledge Retrieval Agent
           → Intent & Behavior Classifier Agent
               ├─ UNKNOWN → Safe Unknown Response
               ├─ CONFIRM → Request Capture Agent
               ├─ HUMAN   → Human Handoff Agent
               └─ ANSWER  → Guest Response Agent
                              → Verification Checks
                              → Send Final Response
                              → Event Log
                              → (context changed?) → Mitri Guest Brief Agent
```

### Tool permission model (excerpt — full matrix in directive §10)

No agent holds a database client that can write every table. Safety Guard and Classifier have no
write access at all; Request Capture can write requests only; Human Handoff can write handoffs and
send notifications; Mitri Brief can write only the guest brief; Owner Insight reads aggregate/
anonymized data only.

### AI pipeline performance rule (new — corrects an implicit "3 LLM calls always" in v1)

Do not run three LLM calls for every message. Approved flow: deterministic safety guard →
deterministic/exact retrieval → behavior classification → answer generation *only if needed* →
deterministic verification → LLM verification *only for uncertain cases*. E.g. a medical keyword
match goes straight to `HUMAN` without ever invoking the response-generation agent; an exact FAQ
match returns a templated `ANSWER` directly.

## 5. Property Context Architecture (new — replaces "single hardcoded property" assumption)

Properties must be swappable without touching core code:

```
contexts/{property_slug}/
├── property.config.json
├── brand_voice.json
├── knowledge_base.json
├── service_menu.json
├── handoff_rules.json
├── staff_roles.json
├── response_policies.json
├── demo_guests.json
└── manifest.json
```

Switching property = swap the context directory + run schema validation + reseed — **no changes to
agent source, orchestration logic, or UI logic** (only branding tokens/content may change). Anything
that varies by property (identity, brand voice, hours, policies, FAQ, services, prices, required
request fields, handoff teams, escalation rules, staff roles, sensitive categories, language, visual
tokens, enabled agents, notification adapters) is data/config, never an `if propertyName === "..."`
in business logic.

## 6. Repository Structure (new)

```
phuket-concierge-copilot/
├── apps/{web,api}/
├── packages/
│   ├── agents/{safety-guard,classifier,retrieval,guest-response,verifier,
│   │            request-capture,human-handoff,mitri-guest-brief,owner-insight}/
│   ├── orchestration/  agent-runtime/  llm-providers/  schemas/
│   ├── database/  event-log/  notifications/  property-context/  ui/
├── config/{agents.registry.ts, models.config.ts, tools.registry.ts, environments/}
├── prompts/{safety-guard,classifier,guest-response,verifier,mitri-guest-brief,owner-insight}/v1.md
├── contexts/demo/nai-harn-wellness-hideaway/   contexts/templates/property-context-template/
├── tests/{unit,integration,agent-contract,regression,fixtures}/
└── docs/{architecture,product,operations}/
```

## 7. Demo Data (resolves most of v1's "gaps" — for the fictional demo property only)

The demo data pack (`backlog_files/phuket_concierge_copilot_demo_data_pack_v1_0/`) supplies, for
**Nai Harn Wellness Hideaway** (fictional, 18 suites, Nai Harn/Rawai Phuket):
- 57 knowledge items, 13 priced services (`service_menu.json`), 18 handoff rules with real
  trigger-example lists and per-role ack-time targets (`handoff_rules.json`), 5 staff roles
  (`staff_roles.json`: Guest Relations, Front Office, Wellness Team, Operations Manager, General
  Manager), demo guests/stays/conversations, an owner report seed, and 40 acceptance tests.
- All of it is explicitly labeled `Demo Data — Not Actual Client Information`; within the demo,
  "VERIFIED" means *verified against these approved fictional documents*, not real hotel data.
- Guest channel P0: standalone web chat only. WhatsApp/OTA/email/front-desk-note are **simulated
  source labels**, not live integrations. Staff dashboard is the source of truth.
- Auth: guest chat has no login (Emma is a pre-seeded identified session; general guests get an
  anonymous session); staff use Supabase magic link or seeded demo users; a `role` field is required,
  granular RBAC is deferred.
- Language: English first for both guest chat and staff dashboard; Thai localization deferred.
- Sensitive data: store only the minimal note needed for handoff, never build a health profile,
  visibly mark sensitive content, support deletion/reset, fictional data only.

This resolves v1 gaps #1–#4 (property identity, KB, service menu, handoff routing) **for the demo**.
It does **not** resolve them for a real pilot property — that remains gated behind the future Client
Pilot Discovery (see discovery-form.md).

## 8. Remaining Gaps (only relevant once a real pilot property is signed — not blocking the demo)

These stay deferred, not urgent, and are **not** ANANT AGENT's responsibility to answer:
1. Real property identity, brand, and KB with named, verifiable `source_owner`s.
2. Real service menu, pricing, and handoff routing/contact channels.
3. Real staff roster, seat count, and auth requirements.
4. Real guest identity/session-matching approach (booking reference? email? none for a soft pilot?).
5. Client-specific pilot KPIs beyond the PRD's generic ones.
6. PDPA/data-residency posture for real guest PII and health-adjacent flags.
7. Budget/timeline for a production build beyond the pilot.

Nothing here blocks scaffolding the demo.

## 9. Required Deliverables Before Full Build (directive §20 — gates unrestricted feature work)

Deliverables **1–6 gate scaffold start**; the rest should follow before "unrestricted feature
implementation":
1. This updated architecture proposal ✅ (this document)
2. Repository tree — drafted in §6, needs to be materialized as the actual scaffold
3. Agent registry draft (`config/agents.registry.ts`) — not yet written
4. Agent runtime interfaces — sketched in §4, not yet implemented
5. LLM provider interface — sketched in §4, not yet implemented
6. Property context schema — sketched in §5, not yet implemented as validated schemas

Still pending after scaffold start: ERD, OpenAPI draft, agent pipeline diagram, state transition
definitions, demo screen inventory, milestone estimate, infra cost estimate, security/privacy
assumptions, final scaffold plan.

## 10. Anti-Spaghetti Rules (non-negotiable, directive §14)

One agent = one responsibility · typed I/O everywhere · no hidden shared mutable state · no direct
SDK calls outside adapters · no direct DB writes outside repositories/services · no prompt embedded
in source · no model config embedded in agent code · no property-specific facts embedded in code ·
no orchestration logic in route handlers · no UI component deciding AI behavior · no agent calling
another agent directly (always through the orchestrator/runtime) · every action emits a traceable
event · every prompt/config/context is versioned · every behavior change needs a regression test.

## 11. Build Sequence (directive §19 — supersedes v1's 12-step order)

1. Monorepo structure → 2. Shared schemas → 3. Agent registry → 4. LLM provider abstraction →
5. Agent runtime → 6. Property context loader → 7. Event log → 8. Seed demo property data →
9. Safety Guard Agent → 10. Retrieval Agent → 11. Behavior Classifier → 12. Response Agent →
13. Deterministic verification → 14. Request Capture → 15. Human Handoff → 16. Guest Chat →
17. Staff Dashboard → 18. Mitri Guest Brief → 19. Owner Insight → 20. Slack demo adapter →
21. Demo seed/reset → 22. Acceptance/regression suite (against the 40-case matrix) →
23. UI polish and demo walkthrough.

## 12. Acceptance Criteria for the Architecture Itself (directive §21)

Adding a new agent = one module + one registry entry · changing an agent's model = one config change
· changing property = a new context pack, not a code edit · prompts are versioned and live outside
source · every agent I/O is schema-validated · orchestration is separate from agent logic · providers
and notification adapters are swappable · DB writes are permission-scoped · every AI/human action is
traceable · demo data is clearly separated from real client data · no P0 feature implies PMS/payment/
production-messaging integration · regression tests protect the guardrails.

## 13. Gate

Do not begin unrestricted feature/scaffold implementation until deliverables 3–6 in §9 exist and are
reviewed by Mos. Once those are produced and approved, this project can be promoted to `ToDo.md` and
scaffold work starts under `Clients/001_anant_agent/PJ_phuket_concierge_copilot/scaffold/`.
