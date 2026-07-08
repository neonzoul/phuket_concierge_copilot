import type { AgentExecutionContext } from "@pcc/schemas";
import { SafetyGuardOutput } from "@pcc/schemas";
import type { PropertyContext } from "@pcc/property-context";

export interface SafetyGuardInput {
  message: string;
  propertyContext: PropertyContext;
}

// Directive §5.1: "deterministic rules first, optional lightweight LLM classification for
// ambiguous cases." This scaffold implements the deterministic pass only — the registry's
// "mock" provider slot is where an LLM escalation path would plug in later, unchanged by callers.
export const safetyGuardAgent = {
  id: "safety-guard",

  async execute(input: SafetyGuardInput, _context: AgentExecutionContext): Promise<SafetyGuardOutput> {
    const message = input.message.toLowerCase();

    for (const rule of input.propertyContext.handoffRules) {
      if (!rule.active) continue;
      const hit = rule.trigger_examples.some((example) => message.includes(example.toLowerCase()));
      if (hit) {
        return SafetyGuardOutput.parse({
          matched: true,
          risk_category: rule.risk_category,
          risk_level: rule.risk_level,
          behavior_state: rule.behavior_state,
          priority: rule.priority,
          handoff_team: rule.handoff_team,
          reason: `Matched handoff rule ${rule.rule_id} (${rule.risk_category}).`,
        });
      }
    }

    return SafetyGuardOutput.parse({
      matched: false,
      risk_category: null,
      risk_level: null,
      behavior_state: null,
      priority: null,
      handoff_team: null,
      reason: "No handoff rule matched.",
    });
  },
};
