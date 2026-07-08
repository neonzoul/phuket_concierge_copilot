import "dotenv/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { loadPropertyContext } from "@pcc/property-context";
import { createOrchestrator } from "@pcc/orchestration";
import { registerRoutes } from "./routes/index.js";

const PROPERTY_SLUG = process.env.PROPERTY_SLUG ?? "nai-harn-wellness-hideaway";
const PORT = Number(process.env.PORT ?? 4100);

const DEFAULT_AGENT_TIMEOUT = { timeoutMs: 5000, retries: 1, fallback: () => ({}) };

// Anchor contexts/ to the repo root by file location, not process.cwd() — `npm run
// --workspace apps/api` runs with cwd set to apps/api, not the repo root.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CONTEXTS_ROOT = join(REPO_ROOT, "contexts", "demo");

async function main() {
  const propertyContext = loadPropertyContext(PROPERTY_SLUG, CONTEXTS_ROOT);

  const orchestrator = createOrchestrator({
    safetyGuard: DEFAULT_AGENT_TIMEOUT,
    retrieval: DEFAULT_AGENT_TIMEOUT,
    classifier: DEFAULT_AGENT_TIMEOUT,
    guestResponse: { ...DEFAULT_AGENT_TIMEOUT, timeoutMs: 8000 },
    verifier: { timeoutMs: 4000, retries: 0, fallback: () => ({ pass: false, unsupported_claims: [], prohibited_phrasing: [], corrected_state: "UNKNOWN", fallback_instruction: "verifier failed" }) },
    requestCapture: DEFAULT_AGENT_TIMEOUT,
    humanHandoff: DEFAULT_AGENT_TIMEOUT,
  });

  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok", property: PROPERTY_SLUG }));

  registerRoutes(app, { orchestrator, propertyContext });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
