#!/usr/bin/env node
/**
 * Build control-plane. On Windows, prisma generate fails with EPERM if another
 * Node process (pnpm dev) has the query engine DLL loaded — skip generate and
 * compile when the client already exists.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: cpRoot, stdio: "inherit", shell: true });
}

const clientIndex = path.join(cpRoot, "node_modules", "@prisma", "client", "index.js");
const hasClient =
  existsSync(clientIndex) ||
  existsSync(path.join(cpRoot, "node_modules", ".prisma", "client", "index.js"));

const gen = run("prisma", ["generate"]);
if (gen.status !== 0) {
  if (hasClient) {
    console.warn(
      "[build] prisma generate failed (often EPERM while pnpm dev is running); using existing client.",
    );
  } else {
    console.error(
      "[build] prisma generate failed. Close other Node/pnpm dev terminals, then: pnpm db:generate",
    );
    process.exit(gen.status ?? 1);
  }
}

const tsc = run("tsc", []);
process.exit(tsc.status ?? 1);
