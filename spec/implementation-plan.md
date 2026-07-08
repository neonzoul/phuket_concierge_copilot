---
type: spec
status: active
lang: en
owner: agent
client: "001_anant_agent"
project: "PJ_phuket_concierge_copilot"
---

# Phuket Concierge Copilot — Implementation Plan

Companion to `architecture-proposal.md`. This plan tracks the directive's 23-step build sequence
(§19) against what this repo already provides, and what's next.

## Running the API

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY at minimum
npm install                 # installs workspace deps (schemas, providers, agents, orchestration, api)
npm run dev:api             # starts the Fastify API on PORT (default 4100)
```

`GET /health` should return `{ status: "ok", property: "nai-harn-wellness-hideaway" }`.
`POST /api/v1/messages` with `{ "message": "What time is breakfast?" }` should return an `ANSWER`
state citing a knowledge item from the demo pack.

## Build sequence status (directive §19)

| # | Step | Status |
|---|---|---|
| 1 | Monorepo structure | ✅ scaffolded — `apps/`, `packages/`, `config/`, `prompts/`, `contexts/` |
| 2 | Shared schemas | ✅ `packages/schemas` — zod schemas for every agent I/O + data entity |
| 3 | Agent registry | ✅ `config/agents.registry.ts` — 9 agents, all currently on the `mock` provider |
| 4 | LLM provider abstraction | ✅ `packages/llm-providers` — `LLMProvider` interface, Anthropic + Mock adapters |
| 5 | Agent runtime | ✅ `packages/agent-runtime` — `Agent<TInput,TOutput>` interface, `runAgent` (timeout/retry/fallback/event-log) |
| 6 | Property context loader | ✅ `packages/property-context` — loads + zod-validates `contexts/{slug}/*.json` |
| 7 | Event log | ✅ `packages/event-log` — in-memory append-only; swap for Supabase later (interface unchanged for callers) |
| 8 | Seed demo property data | ✅ demo data pack copied to `contexts/demo/nai-harn-wellness-hideaway/` (57 KB items, 13 services, 18 handoff rules); guest/stay repo wired (`Guest`/`Stay` schemas, loader, `guestsRepo`/`staysRepo`, `/api/v1/demo/seed/emma`) — `demo_conversations.json` replay is still not wired |
| 9 | Safety Guard Agent | ✅ `packages/agents/safety-guard` — deterministic rule match against `handoff_rules.json` |
| 10 | Retrieval Agent | ✅ `packages/agents/retrieval` — deterministic keyword-overlap match against `knowledge_base.json` |
| 11 | Behavior Classifier | ✅ `packages/agents/classifier` — ANSWER/CONFIRM/UNKNOWN rule logic (HUMAN handled upstream by safety guard, and as a fallback branch) |
| 12 | Response Agent | ✅ `packages/agents/guest-response` — returns the cited item's `verified_answer` verbatim |
| 13 | Deterministic verification | ✅ `packages/agents/verifier` — citation + forbidden-phrase check |
| 14 | Request Capture | ✅ `packages/agents/request-capture` — builds `RequestObject` from `service_menu.json` |
| 15 | Human Handoff | ✅ `packages/agents/human-handoff` — builds `HandoffObject`, resolves ack time from `staff_roles.json` |
| 16 | Guest Chat (UI) | ❌ not started — `apps/web` does not exist yet |
| 17 | Staff Dashboard (UI) | ❌ not started |
| 18 | Mitri Guest Brief | ✅ agent implemented (`packages/agents/mitri-guest-brief`); API route now reads real guest/stay data from `guestsRepo`/`staysRepo` |
| 19 | Owner Insight | ✅ agent + `GET /api/v1/insights/weekly` implemented, aggregates the in-memory event log |
| 20 | Slack demo adapter | ❌ not started — `human-handoff`'s `sendNotification` tool permission is declared but unimplemented |
| 21 | Demo seed/reset | ✅ `/api/v1/demo/reset` clears requests/handoffs/guests/stays/event-log; `/api/v1/demo/seed/emma` seeds `guest_emma_001` + `stay_emma_001` from the demo data pack |
| 22 | Acceptance/regression suite | ❌ not started — `tests/fixtures/acceptance_test_matrix.csv` (40 cases) is in place, no test runner wired yet |
| 23 | UI polish and demo walkthrough | ❌ blocked on 16/17 |

## What's runnable today

The backend pipeline is real and end-to-end for the `ANSWER` / `CONFIRM` / `UNKNOWN` / `HUMAN`
paths, driven entirely by the demo data pack — no LLM calls required (every agent's registry entry
is set to the `mock` provider and the agents themselves are deterministic, per directive §17). You
can `curl` `/api/v1/messages` today and see the full orchestrator flow (safety guard → retrieval →
classifier → response/request/handoff → verification → event log) execute against real demo data.

## Next 2 concrete steps (in order)

1. **Guest Chat UI** (`apps/web`, step 16): a minimal Next.js app with one chat surface calling
   `POST /api/v1/messages` — this is the first UI surface and the one the demo narrative
   (`docs/demo_scenario_script.md`) actually needs.
2. **Acceptance suite runner** (step 22): a small script that replays
   `tests/fixtures/acceptance_test_matrix.csv` against `/api/v1/messages` and diffs the result
   against `expected_state`/`pass_condition` — this is the regression gate the directive calls out
   (§21: "regression tests protect guardrails") and should run before any further build steps.

**Done:** Guest/stay repository (closed step 8) — `Guest`/`Stay`/`SensitiveNote` schemas in
`packages/schemas`, loaded + validated in `packages/property-context/src/loader.ts`, exposed via
`guestsRepo`/`staysRepo` in `apps/api/src/stores.ts`. `/api/v1/demo/seed/emma` seeds
`guest_emma_001` + `stay_emma_001`; `/api/v1/demo/reset` clears them; `GET /api/v1/guests/:id/brief`
reads real guest/stay data instead of placeholders.

Staff Dashboard (17), Slack adapter (20), and full demo polish (23) come after those three, per the
directive's own ordering.

## Known gaps / deliberately deferred (not oversights)

- **No database.** `apps/api/src/stores.ts` is in-memory by design — directive §3 locks Supabase
  Postgres, but wiring it is a distinct, later step (nothing in the scaffold assumes in-memory
  forever; the repo interfaces are the swap point).
- **LLM paths are unused.** Every agent registry entry points at the `mock` provider. The
  `AnthropicProvider` exists and is real, but flipping any agent to `provider: "anthropic"` only
  requires a one-line registry change (directive §21 acceptance criterion: "changing an agent's
  model requires one config change") — do this once ambiguous cases beyond the demo's deterministic
  rules show up.
- **Slack notifications are not sent.** `human-handoff`'s tool permissions declare
  `sendNotification: true`, but no adapter calls out yet — a `packages/notifications/slack.adapter.ts`
  is the natural next piece, kept swappable per directive §3/§14.
