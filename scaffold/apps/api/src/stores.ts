import type { RequestObject, HandoffObject } from "@pcc/schemas";

// In-memory demo repositories (directive §14 rule #5: no direct DB writes outside repositories/
// services — everything else in this app touches requests/handoffs only through these functions).
// Swap the internals for Supabase-backed repos later without touching callers.

let requests: RequestObject[] = [];
let handoffs: HandoffObject[] = [];

export const requestsRepo = {
  add(request: RequestObject): void {
    requests.push(request);
  },
  all(): RequestObject[] {
    return [...requests];
  },
  forGuest(guestId: string): RequestObject[] {
    return requests.filter((r) => r.guest_id === guestId);
  },
  reset(): void {
    requests = [];
  },
};

export const handoffsRepo = {
  add(handoff: HandoffObject): void {
    handoffs.push(handoff);
  },
  all(): HandoffObject[] {
    return [...handoffs];
  },
  forGuest(guestId: string): HandoffObject[] {
    return handoffs.filter((h) => h.guest_id === guestId);
  },
  reset(): void {
    handoffs = [];
  },
};
