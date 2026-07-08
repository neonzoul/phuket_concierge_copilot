import type { EventLogEntry } from "@pcc/schemas";

// Append-only event log (directive §4/§9/§14 rule #13 — all AI/human actions traceable).
// In-memory for the demo scaffold. Swap this module's internals for a Supabase-backed
// implementation later (build sequence step 7) — callers only ever use appendEvent/getEvents,
// so nothing outside this file needs to change.
export interface EventLogStore {
  append(entry: EventLogEntry): void;
  all(): EventLogEntry[];
  byTraceId(traceId: string): EventLogEntry[];
  reset(): void;
}

class InMemoryEventLogStore implements EventLogStore {
  private entries: EventLogEntry[] = [];

  append(entry: EventLogEntry): void {
    this.entries.push(entry);
  }

  all(): EventLogEntry[] {
    return [...this.entries];
  }

  byTraceId(traceId: string): EventLogEntry[] {
    return this.entries.filter((e) => e.trace_id === traceId);
  }

  reset(): void {
    this.entries = [];
  }
}

const store: EventLogStore = new InMemoryEventLogStore();

export function appendEvent(entry: EventLogEntry): void {
  store.append(entry);
}

export function getEvents(): EventLogEntry[] {
  return store.all();
}

export function getEventsByTrace(traceId: string): EventLogEntry[] {
  return store.byTraceId(traceId);
}

export function resetEventLog(): void {
  store.reset();
}
