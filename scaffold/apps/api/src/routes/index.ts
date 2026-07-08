import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { createOrchestrator } from "@pcc/orchestration";
import type { PropertyContext } from "@pcc/property-context";
import { getEvents, resetEventLog } from "@pcc/event-log";
import { mitriGuestBriefAgent } from "@pcc/agent-mitri-guest-brief";
import { ownerInsightAgent } from "@pcc/agent-owner-insight";
import { requestsRepo, handoffsRepo } from "../stores.js";

interface Deps {
  orchestrator: ReturnType<typeof createOrchestrator>;
  propertyContext: PropertyContext;
}

// Directive §9 flow surfaced as HTTP. Route handlers only call the orchestrator/repos — no
// orchestration or business logic lives here (directive §14 rule #9).
export function registerRoutes(app: FastifyInstance, deps: Deps): void {
  const { orchestrator, propertyContext } = deps;

  app.post<{ Body: { message: string; guestId?: string; guestName?: string; conversationId?: string; providedFields?: Record<string, unknown> } }>(
    "/api/v1/messages",
    async (req, reply) => {
      const result = await orchestrator.processMessage({ ...req.body, propertyContext });

      if (result.state === "CONFIRM") requestsRepo.add(result.request);
      if (result.state === "HUMAN") handoffsRepo.add(result.handoff);

      return reply.send(result);
    }
  );

  app.get("/api/v1/staff/inbox", async () => ({
    pending_requests: requestsRepo.all().filter((r) => r.status === "pending_confirmation"),
    open_handoffs: handoffsRepo.all().filter((h) => h.status !== "resolved"),
  }));

  app.get<{ Params: { id: string } }>("/api/v1/guests/:id/brief", async (req) => {
    const guestId = req.params.id;
    // NOTE: no guest repo yet (build sequence step 8) — brief is composed from requests/handoffs
    // only until demo_guests.json is wired into a real store.
    const brief = await mitriGuestBriefAgent.execute(
      {
        guestId,
        guestName: guestId,
        preferences: [],
        sensitiveNotes: [],
        requests: requestsRepo.forGuest(guestId),
        handoffs: handoffsRepo.forGuest(guestId),
        sourceEventIds: [],
      },
      {
        traceId: randomUUID(),
        propertyId: propertyContext.propertyConfig.property_id as string,
        actorType: "staff",
        agentConfigVersion: "1.0.0",
        promptVersion: "v1",
        startedAt: new Date().toISOString(),
      }
    );
    return brief;
  });

  app.get("/api/v1/insights/weekly", async () => {
    const insight = await ownerInsightAgent.execute(
      { events: getEvents() },
      {
        traceId: randomUUID(),
        propertyId: propertyContext.propertyConfig.property_id as string,
        actorType: "staff",
        agentConfigVersion: "1.0.0",
        promptVersion: "v1",
        startedAt: new Date().toISOString(),
      }
    );
    return insight;
  });

  app.get("/api/v1/knowledge", async () => propertyContext.knowledgeBase);

  app.post("/api/v1/demo/reset", async () => {
    requestsRepo.reset();
    handoffsRepo.reset();
    resetEventLog();
    return { status: "reset" };
  });

  app.post("/api/v1/demo/seed/emma", async () => {
    // TODO: seed the guest/stay/conversation repos from
    // contexts/demo/nai-harn-wellness-hideaway/demo_guests.json + demo_stays.json once a guest
    // repo exists (build sequence step 8). The event log / request / handoff stores already
    // reset cleanly via /api/v1/demo/reset.
    return { status: "not_implemented", note: "Guest repo not yet scaffolded — see implementation-plan.md" };
  });
}
