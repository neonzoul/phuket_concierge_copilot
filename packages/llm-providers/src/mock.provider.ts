import type { AgentRuntimeConfig, LLMProvider } from "./types.js";

// Deterministic provider for tests/demo runs (directive §7 — "P0 uses Anthropic + Mock provider
// for deterministic test/demo runs"). Register fixed responses per agent id; falls back to an
// empty JSON object so callers can still exercise their own parsing/validation path.
export class MockProvider implements LLMProvider {
  private fixtures: Map<string, unknown>;

  constructor(fixtures: Record<string, unknown> = {}) {
    this.fixtures = new Map(Object.entries(fixtures));
  }

  async generate<TInput, TOutput>(config: AgentRuntimeConfig, _input: TInput): Promise<TOutput> {
    const fixture = this.fixtures.get(config.id);
    if (fixture === undefined) {
      return "{}" as unknown as TOutput;
    }
    return (typeof fixture === "string" ? fixture : JSON.stringify(fixture)) as unknown as TOutput;
  }
}
