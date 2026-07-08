import { readFileSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Build sequence step 22 (directive §21: "regression tests protect guardrails"). Replays
// tests/fixtures/acceptance_test_matrix.csv against a live /api/v1/messages and diffs the
// orchestrator's actual behavior_state (and, for CONFIRM/HUMAN, the assigned team) against the
// matrix's expected columns. This is a black-box HTTP check, not an in-process call, so it also
// catches route-wiring regressions.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = join(REPO_ROOT, "tests", "fixtures", "acceptance_test_matrix.csv");
const PORT = Number(process.env.ACCEPTANCE_TEST_PORT ?? 4300);
const BASE_URL = `http://localhost:${PORT}`;

interface TestCase {
  testId: string;
  guestMessage: string;
  expectedState: string;
  expectedAction: string;
  forbiddenBehavior: string;
  expectedTeam: string;
}

interface CaseResult {
  tc: TestCase;
  pass: boolean;
  detail: string;
}

// The fixture has no quoted/escaped commas today — plain split is enough. If that ever changes,
// this will need a real CSV parser. It does ship with a UTF-8 BOM and CRLF line endings, though —
// strip both, or the last column on every row keeps a trailing \r.
function parseCsv(path: string): TestCase[] {
  let content = readFileSync(path, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const [, ...rows] = content.trim().split(/\r?\n/);
  return rows.map((line) => {
    const [testId, guestMessage, expectedState, expectedAction, forbiddenBehavior, expectedTeam] =
      line.split(",");
    return { testId, guestMessage, expectedState, expectedAction, forbiddenBehavior, expectedTeam };
  });
}

function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${BASE_URL}/health`);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // API not accepting connections yet — keep polling.
      }
      if (Date.now() > deadline) {
        reject(new Error("API did not become healthy within the timeout"));
        return;
      }
      setTimeout(tick, 300);
    };
    tick();
  });
}

function startApi(): ChildProcess {
  // .cmd shims (npx on Windows) require shell:true to spawn at all — pass the whole invocation as
  // one string rather than a separate args array, since shell:true + args is what trips Node's
  // unescaped-argument-concatenation warning. There's no untrusted input here to worry about.
  return spawn("npx tsx apps/api/src/server.ts", {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: String(PORT) },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function stopApi(api: ChildProcess): void {
  if (!api.pid) return;
  // shell:true spawns an intermediate shell on Windows — api.kill() alone can leave the actual
  // tsx/node process running, so force-kill the whole tree there.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(api.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    api.kill("SIGTERM");
  }
}

// ANSWER/UNKNOWN responses never carry a team (guest-response/verifier don't assign one) — the
// matrix's expected_team for those rows describes who *would* handle it if escalated, not
// something the current pipeline returns, so only CONFIRM/HUMAN team assignment is checkable.
function actualTeam(result: Record<string, unknown>): string | null {
  const request = result.request as { assigned_team?: string } | undefined;
  const handoff = result.handoff as { assigned_team?: string } | undefined;
  return request?.assigned_team ?? handoff?.assigned_team ?? null;
}

async function runOne(tc: TestCase): Promise<CaseResult> {
  const res = await fetch(`${BASE_URL}/api/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: tc.guestMessage, guestId: `acceptance-${tc.testId}` }),
  });
  const result = await res.json();

  if (result.state !== tc.expectedState) {
    return {
      tc,
      pass: false,
      detail: `expected state ${tc.expectedState}, got ${result.state} — "${result.responseText}"`,
    };
  }

  if (tc.expectedState === "CONFIRM" || tc.expectedState === "HUMAN") {
    const team = actualTeam(result);
    if (team !== null && team !== tc.expectedTeam) {
      return { tc, pass: false, detail: `state OK, but team ${team} !== expected ${tc.expectedTeam}` };
    }
  }

  return { tc, pass: true, detail: result.responseText };
}

async function main() {
  const cases = parseCsv(CSV_PATH);
  console.log(`Loaded ${cases.length} acceptance cases from ${CSV_PATH}\n`);

  console.log(`Starting API on port ${PORT}...`);
  const api = startApi();
  let apiLog = "";
  api.stdout?.on("data", (d) => (apiLog += d.toString()));
  api.stderr?.on("data", (d) => (apiLog += d.toString()));

  try {
    await waitForHealth(15000);
  } catch (err) {
    console.error(apiLog);
    stopApi(api);
    throw err;
  }

  const results: CaseResult[] = [];
  for (const tc of cases) {
    results.push(await runOne(tc));
  }

  stopApi(api);

  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.tc.testId.padEnd(9)} ${r.detail}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
