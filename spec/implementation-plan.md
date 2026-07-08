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
| 16 | Guest Chat (UI) | ✅ `apps/web` — minimal Next.js 14 App Router chat surface calling `POST /api/v1/messages` via a same-origin rewrite proxy |
| 17 | Staff Dashboard (UI) | ❌ not started |
| 18 | Mitri Guest Brief | ✅ agent implemented (`packages/agents/mitri-guest-brief`); API route now reads real guest/stay data from `guestsRepo`/`staysRepo` |
| 19 | Owner Insight | ✅ agent + `GET /api/v1/insights/weekly` implemented, aggregates the in-memory event log |
| 20 | Slack demo adapter | ❌ not started — `human-handoff`'s `sendNotification` tool permission is declared but unimplemented |
| 21 | Demo seed/reset | ✅ `/api/v1/demo/reset` clears requests/handoffs/guests/stays/event-log; `/api/v1/demo/seed/emma` seeds `guest_emma_001` + `stay_emma_001` from the demo data pack |
| 22 | Acceptance/regression suite | ✅ `tests/run-acceptance.ts` (`npm run test`) spins up the API, replays all 40 `tests/fixtures/acceptance_test_matrix.csv` cases against `/api/v1/messages`, diffs `state` (and, for CONFIRM/HUMAN, `assigned_team`) — 29/40 pass today; see "Acceptance suite findings" below |
| 23 | UI polish and demo walkthrough | ❌ blocked on 16/17 |

## What's runnable today

The backend pipeline is real and end-to-end for the `ANSWER` / `CONFIRM` / `UNKNOWN` / `HUMAN`
paths, driven entirely by the demo data pack — no LLM calls required (every agent's registry entry
is set to the `mock` provider and the agents themselves are deterministic, per directive §17). You
can `curl` `/api/v1/messages` today and see the full orchestrator flow (safety guard → retrieval →
classifier → response/request/handoff → verification → event log) execute against real demo data.

## Next concrete step

**Fix the 11 acceptance-suite failures** surfaced by `npm run test` (see "Acceptance suite
findings" below) before Staff Dashboard / Slack adapter / demo polish — this is the regression gate
the directive calls out (§21: "regression tests protect guardrails") and it now runs, and fails,
honestly.

**Done:**
- Guest/stay repository (closed step 8) — `Guest`/`Stay`/`SensitiveNote` schemas in
  `packages/schemas`, loaded + validated in `packages/property-context/src/loader.ts`, exposed via
  `guestsRepo`/`staysRepo` in `apps/api/src/stores.ts`. `/api/v1/demo/seed/emma` seeds
  `guest_emma_001` + `stay_emma_001`; `/api/v1/demo/reset` clears them; `GET /api/v1/guests/:id/brief`
  reads real guest/stay data instead of placeholders.
- Guest Chat UI (closed step 16) — `apps/web`, a minimal Next.js 14 App Router app (`npm run
  dev:web`, port 3000). One chat surface posts to `/api/v1/messages` through a same-origin
  `/api/*` rewrite (`next.config.mjs`) proxied to the Fastify API, so no CORS changes were needed.
  Each assistant turn renders the API's literal `state` (ANSWER/CONFIRM/HUMAN/UNKNOWN) as a badge
  next to the unmodified `responseText` — verified in a headless browser against all three states
  from the demo scenario script (breakfast → ANSWER, airport pickup → CONFIRM with the real missing
  fields list, blood-pressure/detox → HUMAN). No image assets yet; the hero banner is a labeled
  placeholder block.
- Acceptance suite runner (closed step 22) — `tests/run-acceptance.ts` (`npm run test`) spawns the
  API on a dedicated port, replays all 40 matrix cases against `/api/v1/messages`, diffs `state`
  (and `assigned_team` for CONFIRM/HUMAN, since ANSWER/UNKNOWN never carry one), prints a
  PASS/FAIL line per case, and exits non-zero on any failure. Currently **29/40 pass** — see
  findings below.

Staff Dashboard (17), Slack adapter (20), and full demo polish (23) come after this, per the
directive's own ordering.

## Acceptance suite findings (2026-07-08 run, 29/40 passing)

These are real gaps in the deterministic `classifier`/`retrieval`/`safety-guard` agents, not caused
by the guest/stay repo or Guest Chat UI work above (neither touches that code path). Left
undiagnosed/unfixed here — diagnosing and fixing agent behavior is a distinct, larger task from
building the runner that surfaces them:

- **FAQ-008/FAQ-010** ("How long from the airport?", "store bags after checkout?") — the classifier
  checks the service-menu keyword match *before* the FAQ match (by design, to route real bookings to
  CONFIRM — see `packages/agents/classifier/src/index.ts`), but that means questions that merely
  share a word with a service name (e.g. "airport" also appears in an airport-transfer service) get
  misrouted to CONFIRM instead of ANSWER.
- **FAQ-009/UNK-003** (payment method questions) — inverted: FAQ-009 expects ANSWER but the
  retrieval agent doesn't find the knowledge item; UNK-003 expects UNKNOWN but a different payment
  question does match — the keyword-overlap retrieval is inconsistent across near-duplicate
  phrasings of the same question.
- **REQ-005/REQ-007** (dietary request, seafood dinner reservation) — expected CONFIRM but retrieval
  found an FAQ match first (or nothing), so these never reach the service-menu check.
- **REQ-010** (private boat) — state matched, but the request landed on `front_office` instead of
  the matrix's `guest_relations`; a `service_menu.json` `assigned_team` mismatch.
- **TRAP-002/003/004/007** (marine safety, dolphin sighting, discount request, checkin guarantee) —
  none of these have a matching knowledge item or service, so they all fall through to UNKNOWN
  rather than their intended HUMAN/ANSWER/CONFIRM state; likely missing entries in
  `knowledge_base.json`/`service_menu.json`/`handoff_rules.json`, not classifier bugs.

Fixing these means either tuning the classifier's keyword-overlap heuristics or adding/correcting
entries in `contexts/demo/nai-harn-wellness-hideaway/{knowledge_base,service_menu,handoff_rules}.json`
— worth doing as its own focused pass with `npm run test` as the feedback loop, rather than bundled
into unrelated feature work.

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
