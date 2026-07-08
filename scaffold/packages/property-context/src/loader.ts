import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  KnowledgeItem,
  ServiceDefinition,
  HandoffRule,
  StaffRole,
} from "@pcc/schemas";

// Directive §5: "when property changes → change context directory, run schema validation, seed
// database, no change to agent source code, no change to orchestration logic." This loader is the
// one place that reads contexts/{property_slug}/*.json — agents never read the filesystem directly.

export interface PropertyContext {
  propertySlug: string;
  propertyConfig: Record<string, unknown>;
  brandVoice: Record<string, unknown>;
  knowledgeBase: KnowledgeItem[];
  serviceMenu: ServiceDefinition[];
  handoffRules: HandoffRule[];
  staffRoles: StaffRole[];
  manifest: Record<string, unknown>;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

// contexts/ lives at the repo root (directive §11 repo structure).
export function loadPropertyContext(
  propertySlug: string,
  contextsRoot = join(process.cwd(), "contexts", "demo")
): PropertyContext {
  const dir = join(contextsRoot, propertySlug);

  const propertyConfig = readJson(join(dir, "property.config.json")) as Record<string, unknown>;
  const brandVoice = readJson(join(dir, "brand_voice.json")) as Record<string, unknown>;
  const manifest = readJson(join(dir, "manifest.json")) as Record<string, unknown>;

  const knowledgeBaseRaw = readJson(join(dir, "knowledge_base.json")) as {
    knowledge_items: unknown[];
  };
  const knowledgeBase = knowledgeBaseRaw.knowledge_items.map((item) => KnowledgeItem.parse(item));

  const serviceMenuRaw = readJson(join(dir, "service_menu.json")) as { services: unknown[] };
  const serviceMenu = serviceMenuRaw.services.map((item) => ServiceDefinition.parse(item));

  const handoffRulesRaw = readJson(join(dir, "handoff_rules.json")) as { rules: unknown[] };
  const handoffRules = handoffRulesRaw.rules.map((item) => HandoffRule.parse(item));

  const staffRolesRaw = readJson(join(dir, "staff_roles.json")) as { roles: unknown[] };
  const staffRoles = staffRolesRaw.roles.map((item) => StaffRole.parse(item));

  return {
    propertySlug,
    propertyConfig,
    brandVoice,
    knowledgeBase,
    serviceMenu,
    handoffRules,
    staffRoles,
    manifest,
  };
}
