# Phuket Concierge Copilot — Scaffold

Pre-implement scaffold for ANANT AGENT's Phuket Concierge Copilot demo. Copy this folder into the
Coding Area as its own repo, the same way `Clients/000_lazyhardwork/PJ_lineOA_chatcot_v1/scaffold/`
became the Agent Lay bot's repo.

**Read `doc/spec/architecture-proposal.md` and `doc/spec/implementation-plan.md` first** — they are
the authority for what this scaffold implements and what's still open.

## What this is

A TypeScript monorepo implementing the client-approved multi-agent architecture (see
`PHUKET_CONCIERGE_COPILOT_ARCHITECTURE_APPROVAL_MULTI_AGENT_DIRECTIVE_v1_0.md`): 9 small,
single-purpose agents behind one orchestrator, a versioned agent registry, a swappable LLM
provider abstraction, and a property-context loader so the demo property (or a future real
property) is data, never code.

```
apps/api/            Fastify server — the only HTTP surface today
packages/schemas/     zod schemas — every agent input/output, validated
packages/llm-providers/  LLMProvider interface + Anthropic/Mock adapters
packages/agent-runtime/  Agent interface + runAgent (timeout/retry/fallback/event-log)
packages/property-context/  loads + validates contexts/{slug}/*.json
packages/event-log/   append-only event log (in-memory; Supabase-swappable)
packages/agents/*/    the 9 agents (safety-guard, classifier, retrieval, guest-response,
                       verifier, request-capture, human-handoff, mitri-guest-brief, owner-insight)
packages/orchestration/  wires the agents per the directive's flow diagram — no business logic
config/               agents.registry.ts + tools.registry.ts — single source of truth
prompts/              versioned prompt files (currently unused — every agent runs deterministically)
contexts/demo/nai-harn-wellness-hideaway/  the approved fictional demo data pack
examples/             canonical expected outputs from the demo data pack
tests/fixtures/        40-case acceptance test matrix
docs/                 demo scenario script
```

`apps/web` (Guest Chat / Staff Dashboard UI) does not exist yet — see implementation-plan.md's
"next 3 steps."

## Quick start

```bash
cp .env.example .env    # fill in ANTHROPIC_API_KEY (not required for the demo — every agent
                         # registry entry currently points at the mock provider)
npm install
npm run dev:api
curl -X POST http://localhost:4100/api/v1/messages \
  -H "content-type: application/json" \
  -d '{"message": "What time is breakfast?"}'
```

## Non-negotiable rules (directive §14 — carry these into every change)

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
