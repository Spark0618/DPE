#!/usr/bin/env node
/**
 * P6 acceptance: P5 + unit tests + lint + security audit; optional full stack E2E.
 *   pnpm verify:p6
 *   pnpm verify:p6 --live   # Postgres + control-plane + signaling + lan-agent + E2E
 */
import { spawn, spawnSync } from "node:child_process";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import WebSocket from "ws";
import { runE2eSmoke } from "./e2e-smoke.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });

const DEFAULT_DB = "postgresql://dpe:dpe@localhost:5432/dpe";

function run(cmd, args, label, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true, env: process.env });
  if (r.status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(r.status ?? 1);
  }
  console.log(`OK: ${label}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealth(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (body.status === "ok") return;
    } catch {
      /* retry */
    }
    await sleep(300);
  }
  throw new Error(`health timeout: ${url}`);
}

/** P6 live ports (avoid 3001–3003 dev defaults and verify-p2/p3 smoke ports). */
const CP_PORT = 3106;
const SIG_PORT = 3105;
const LAN_PORT = 3104;

async function signalingQuickCheck() {
  const base = `ws://127.0.0.1:${SIG_PORT}/ws`;
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(base);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("signaling ws timeout"));
    }, 8000);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", room: "verify-p6", node_id: "e2e-a" }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "peers") {
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
  console.log("OK: signaling join/peers (live)");
}

async function liveStack() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DB;
  process.env.DATABASE_URL = databaseUrl;
  run("pnpm", ["--filter", "@dpe/control-plane", "db:push"], "prisma db push");

  const cpDir = path.join(root, "apps", "control-plane");
  const children = [];

  const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  const spawnService = (appDir, entry, portEnv, port, extraEnv = {}) => {
    const child = spawn(pnpmCmd, ["exec", "tsx", entry], {
      cwd: path.join(root, "apps", appDir),
      env: {
        ...process.env,
        [portEnv]: String(port),
        DPE_DISABLE_MDNS: "1",
        ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(`[${appDir}] ${chunk}`);
    });
    child.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[${appDir}] exited code=${code} signal=${signal}`);
      }
    });
    children.push(child);
    return child;
  };

  spawnService("control-plane", "src/main.ts", "PORT", CP_PORT, { DATABASE_URL: databaseUrl });
  spawnService("signaling", "src/index.ts", "SIGNALING_PORT", SIG_PORT);
  spawnService("lan-agent", "src/index.ts", "LAN_AGENT_PORT", LAN_PORT);

  await sleep(2500);

  try {
    await waitHealth(`http://127.0.0.1:${CP_PORT}/health`, 60);
    await waitHealth(`http://127.0.0.1:${SIG_PORT}/health`, 40);
    await waitHealth(`http://127.0.0.1:${LAN_PORT}/health`, 40);
    console.log("OK: live stack health");

    await runE2eSmoke({ controlPlaneUrl: `http://127.0.0.1:${CP_PORT}` });
    console.log("OK: E2E API smoke");

    await signalingQuickCheck();
    await fetch(`http://127.0.0.1:${LAN_PORT}/peers/manual`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: "p6-verify", host: "127.0.0.1", port: LAN_PORT }),
    });
    const search = await fetch(`http://127.0.0.1:${LAN_PORT}/peers?uid=p6-verify`);
    const body = await search.json();
    if (!body.peers?.length) throw new Error("lan-agent peer search failed");
    console.log("OK: lan-agent manual peer (live)");

    console.log("\nP6 verification passed (with --live E2E).");
  } finally {
    for (const c of children) c.kill("SIGTERM");
  }
}

async function main() {
  const liveOnly = process.argv.includes("--live-only");

  if (!liveOnly) {
    run("node", ["scripts/verify-p5.mjs"], "P5 baseline");
    run("node", ["scripts/security-audit.mjs"], "security audit");
    run("pnpm", ["test"], "turbo test (all packages)");
    run("pnpm", ["lint"], "turbo lint (all packages)");
  }

  if (!process.argv.includes("--live") && !liveOnly) {
    console.log("\nP6 verification passed (offline). Run with --live for Postgres + E2E stack.");
    return;
  }

  await liveStack();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
