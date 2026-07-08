import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { createOrchestrator } from "@pcc/orchestration";
import type { PropertyContext } from "@pcc/property-context";
import { getEvents, resetEventLog } from "@pcc/event-log";
import { mitriGuestBriefAgent } from "@pcc/agent-mitri-guest-brief";
import { ownerInsightAgent } from "@pcc/agent-owner-insight";
import { requestsRepo, handoffsRepo, guestsRepo, staysRepo } from "../stores.js";

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
    const guest = guestsRepo.get(guestId);
    const stay = staysRepo.forGuest(guestId)[0];
    const brief = await mitriGuestBriefAgent.execute(
      {
        guestId,
        guestName: guest?.full_name ?? guestId,
        stay,
        preferences: guest?.preferences ?? [],
        sensitiveNotes: guest?.sensitive_notes.map((n) => n.summary) ?? [],
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
    guestsRepo.reset();
    staysRepo.reset();
    resetEventLog();
    return { status: "reset" };
  });

  app.post("/api/v1/demo/seed/emma", async () => {
    const guest = propertyContext.demoGuests.find((g) => g.guest_id === "guest_emma_001");
    const stay = propertyContext.demoStays.find((s) => s.guest_id === "guest_emma_001");

    if (!guest || !stay) {
      return { status: "not_found", note: "guest_emma_001 missing from the demo data pack" };
    }

    if (!guestsRepo.get(guest.guest_id)) guestsRepo.add(guest);
    if (!staysRepo.forGuest(guest.guest_id).length) staysRepo.add(stay);

    return { status: "seeded", guest_id: guest.guest_id, stay_id: stay.stay_id };
  });
}
