# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

The repo root **is** the npm workspace root — `package.json` and every workspace
(`apps/`, `packages/`, `config/`, `prompts/`, `contexts/`, `tests/`, `docs/`, `examples/`) live at
the top level. (Earlier revisions nested all of this under a `scaffold/` subdirectory, matching the
upstream template's "copy this folder out as its own repo" convention — it has since been flattened
here since this repo *is* that copy.)

- `spec/` — `architecture-proposal.md` and `implementation-plan.md`, the authority for what this
  repo implements and what's still open
- `Resources/build-pack/` — the client-approved directive
  (`PHUKET_CONCIERGE_COPILOT_ARCHITECTURE_APPROVAL_MULTI_AGENT_DIRECTIVE_v1_0.md`) that `spec/` and
  every "directive §N" comment in the code refers to

**Read `spec/architecture-proposal.md` and `spec/implementation-plan.md` first** when picking up new
work — the implementation plan tracks the directive's 23-step build sequence against what exists
today and lists the next concrete steps in order.

## Commands

Run from the repo root:

```bash
npm install
npm run dev:api       # starts the Fastify API (apps/api), default port 4100
npm run build         # builds all workspaces
npm run test          # runs tests in all workspaces (no test runner wired yet — see Known gaps)
```

Smoke test once the API is running:

```bash
curl http://localhost:4100/health
curl -X POST http://localhost:4100/api/v1/messages \
  -H "content-type: application/json" \
  -d '{"message": "What time is breakfast?"}'
```

There is no single-test command yet — `tests/fixtures/acceptance_test_matrix.csv` (40 cases) exists
but no runner replays it against the API yet (build sequence step 22, currently unstarted).

## Architecture

A multi-agent guest-care pipeline for a fictional demo hotel property, implementing the
client-approved directive: 9 small, single-purpose agents behind one orchestrator, a versioned
agent registry, a swappable LLM provider abstraction, and a property-context loader so the demo
property (or a future real property) is data, never code.

```
apps/api/                Fastify server — the only HTTP surface today
packages/schemas/        zod schemas — every agent input/output, validated
packages/llm-providers/  LLMProvider interface + Anthropic/Mock adapters
packages/agent-runtime/  Agent interface + runAgent (timeout/retry/fallback/event-log)
packages/property-context/  loads + validates contexts/{slug}/*.json
packages/event-log/      append-only event log (in-memory; Supabase-swappable)
packages/agents/*/       the 9 agents (safety-guard, classifier, retrieval, guest-response,
                          verifier, request-capture, human-handoff, mitri-guest-brief, owner-insight)
packages/orchestration/  wires the agents per the directive's flow diagram — no business logic
config/                  agents.registry.ts + tools.registry.ts — single source of truth
prompts/                 versioned prompt files (currently unused — every agent runs deterministically)
contexts/demo/nai-harn-wellness-hideaway/  the approved fictional demo data pack
```

`apps/web` (Guest Chat / Staff Dashboard UI) does not exist yet.

### Request flow

`POST /api/v1/messages` → `orchestrator.processMessage` (`packages/orchestration/src/orchestrator.ts`)
runs, in order, through `runAgent` (`packages/agent-runtime/src/runAgent.ts`):

1. **safety-guard** — deterministic rule match against `handoff_rules.json`. If it matches a
   `HUMAN` state, skip straight to human-handoff.
2. **retrieval** — deterministic keyword-overlap match against `knowledge_base.json`.
3. **classifier** — decides `ANSWER` / `CONFIRM` / `HUMAN` / `UNKNOWN` from the retrieval result and
   a service-menu match (service match is checked *before* FAQ match, so a booking-shaped message
   becomes `CONFIRM` even if it also keyword-overlaps an FAQ item).
4. Branch on `behavior_state`:
   - `ANSWER` → **guest-response** (returns the cited item's `verified_answer` verbatim) →
     **verifier** (citation + forbidden-phrase check; failure downgrades to `UNKNOWN`)
   - `CONFIRM` → **request-capture** builds a `RequestObject` from `service_menu.json`
   - `HUMAN` → **human-handoff** builds a `HandoffObject`, resolves ack time from `staff_roles.json`
   - `UNKNOWN` → fixed no-guess template, no LLM call

Every agent call is logged to the in-memory event log (`packages/event-log`), keyed by a per-request
`traceId`. `mitri-guest-brief` and `owner-insight` are invoked directly from routes
(`apps/api/src/routes/index.ts`), not through the orchestrator — they read requests/handoffs/events
rather than participating in the message pipeline.

All 9 agents currently run on the `mock` LLM provider and are fully deterministic (no network
calls) — the demo works end-to-end without an API key. Flipping an agent to real Anthropic calls is
a one-line change in `config/agents.registry.ts` (`provider: "anthropic"`).

### Non-negotiable rules (directive §14 — carry these into every change)

- One agent = one responsibility. No agent calls another agent directly — only through
  `runAgent`/the orchestrator.
- No hardcoded model name, prompt path, timeout, or retry count in an agent file — it comes from
  `config/agents.registry.ts`.
- No property-specific fact in source code — it comes from `contexts/{slug}/`.
- No direct Anthropic SDK import outside `packages/llm-providers`.
- No direct database write outside a repository (`apps/api/src/stores.ts` today).
- Every prompt/config/context is versioned. Every behavior change needs a regression test.

`Demo Data — Not Actual Client Information` labels everything under `contexts/demo/` — do not
present it as real property data.

### Known gaps / deliberately deferred (not oversights)

- **No database.** `apps/api/src/stores.ts` is in-memory by design; the repo interfaces
  (`requestsRepo`, `handoffsRepo`) are the intended swap point for Supabase Postgres later.
- **Slack notifications are not sent.** `human-handoff`'s `sendNotification` tool permission is
  declared in `config/tools.registry.ts` but no adapter calls out yet.

## Build TODO (phase plan)

Executed phase by phase, in this order (matches `implementation-plan.md`'s "next 3 concrete steps"
plus the remaining build-sequence items). Check off as each phase lands; keep this list in sync with
`spec/implementation-plan.md`'s status table.

- [x] **Phase 1 — Guest/stay repository** (closes build step 8)
  - Add `Guest`/`Stay`/`SensitiveNote` zod schemas to `packages/schemas/src/index.ts`, matching
    `demo_guests.json` / `demo_stays.json` shapes.
  - Load + validate `demo_guests.json` / `demo_stays.json` in `packages/property-context/src/loader.ts`
    (the one place that reads `contexts/{slug}/*.json`), exposed on `PropertyContext`.
  - Add `guestsRepo` / `staysRepo` to `apps/api/src/stores.ts`, same `add/all/forGuest/reset` shape as
    `requestsRepo`/`handoffsRepo`, plus a `seed()` that copies from the loaded property context.
  - Wire `POST /api/v1/demo/seed/emma` to seed `guest_emma_001` + `stay_emma_001`; wire
    `POST /api/v1/demo/reset` to also reset guests/stays.
  - Replace the placeholder `guestName`/`preferences`/`sensitiveNotes: []` in
    `GET /api/v1/guests/:id/brief` with real repo data (map `sensitive_notes[].summary` → `string[]`
    for the agent's `sensitiveNotes: string[]` input).
- [ ] **Phase 2 — Guest Chat UI** (`apps/web`, build step 16)
  - Minimal Next.js app, one chat surface calling `POST /api/v1/messages`.
- [ ] **Phase 3 — Acceptance suite runner** (build step 22)
  - Script that replays `tests/fixtures/acceptance_test_matrix.csv` against `/api/v1/messages` and
    diffs against `expected_state`/`pass_condition`; wire into `npm run test`.
- [ ] **Phase 4 — Staff Dashboard UI** (build step 17, blocked on Phase 1 for real guest data)
- [ ] **Phase 5 — Slack demo adapter** (build step 20): implement `human-handoff`'s
  `sendNotification` tool.
- [ ] **Phase 6 — UI polish / demo walkthrough** (build step 23, blocked on Phases 2/4).
