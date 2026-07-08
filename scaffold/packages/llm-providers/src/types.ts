// Directive §7 hard rule: business logic calls llmProvider.generate(...), never an SDK directly.

export interface AgentRuntimeConfig {
  id: string;
  provider: "anthropic" | "mock";
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retries: number;
  promptPath: string;
}

export interface LLMProvider {
  generate<TInput, TOutput>(config: AgentRuntimeConfig, input: TInput): Promise<TOutput>;
}
