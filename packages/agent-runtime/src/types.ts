import type { AgentExecutionContext } from "@pcc/schemas";

// Directive §8 — every agent implements this same interface.
export interface Agent<TInput, TOutput> {
  id: string;
  execute(input: TInput, context: AgentExecutionContext): Promise<TOutput>;
}

export interface RunAgentOptions {
  timeoutMs: number;
  retries: number;
  fallback: () => unknown;
}

export type { AgentExecutionContext };
