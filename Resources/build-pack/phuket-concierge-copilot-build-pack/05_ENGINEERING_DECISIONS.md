# Engineering Decisions

## Locked Defaults
- Frontend: Next.js / React mobile-first web app
- Backend: FastAPI or Node service with explicit orchestration layer
- Database: Supabase / Postgres
- Knowledge store: structured relational or JSON records before vector DB
- LLM use: classifier + answer generator + verifier
- Notifications: Slack or Telegram mock for demo
- Authentication: simple staff/admin auth for pilot
- Deployment: Vercel frontend and Railway or Render backend
- Telemetry: structured event log and basic latency/error metrics

## Explicit Non-Decisions
- No PMS integration in v1
- No payment flow in v1
- No auto-confirmation in v1
- No live inventory synchronization in v1

## Operational Truth
The web app dashboard is the source of truth for:
- Guest Brief
- Request Log
- Handoff Log
- Knowledge Base
- Weekly Insight

## Build Constraints
- Keep state transitions explicit.
- Keep request and handoff objects structured.
- Keep all AI outputs auditable.
- Keep the demo deterministic.

