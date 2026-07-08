import type { RequestObject, HandoffObject, Guest, Stay } from "@pcc/schemas";

// In-memory demo repositories (directive §14 rule #5: no direct DB writes outside repositories/
// services — everything else in this app touches requests/handoffs only through these functions).
// Swap the internals for Supabase-backed repos later without touching callers.

let requests: RequestObject[] = [];
let handoffs: HandoffObject[] = [];
let guests: Guest[] = [];
let stays: Stay[] = [];

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

// Seeded from contexts/{slug}/demo_guests.json + demo_stays.json (via PropertyContext) —
// starts empty, populated by the demo seed endpoints, not loaded eagerly at startup.
export const guestsRepo = {
  add(guest: Guest): void {
    guests.push(guest);
  },
  all(): Guest[] {
    return [...guests];
  },
  get(guestId: string): Guest | undefined {
    return guests.find((g) => g.guest_id === guestId);
  },
  reset(): void {
    guests = [];
  },
};

export const staysRepo = {
  add(stay: Stay): void {
    stays.push(stay);
  },
  all(): Stay[] {
    return [...stays];
  },
  forGuest(guestId: string): Stay[] {
    return stays.filter((s) => s.guest_id === guestId);
  },
  reset(): void {
    stays = [];
  },
};
