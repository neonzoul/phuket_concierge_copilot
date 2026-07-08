import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import type { AgentRuntimeConfig, LLMProvider } from "./types.js";

// P0 real adapter (directive §7). Prompts are versioned files outside source (directive §14 rule #6).
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate<TInput, TOutput>(config: AgentRuntimeConfig, input: TInput): Promise<TOutput> {
    const systemPrompt = readFileSync(config.promptPath, "utf-8");

    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Agents that need structured output parse `text` as JSON themselves against their own
    // zod output schema (directive §14 rule #2) — this adapter stays provider-shaped only.
    return text as unknown as TOutput;
  }
}
