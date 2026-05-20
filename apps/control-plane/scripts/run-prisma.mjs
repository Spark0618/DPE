#!/usr/bin/env node
/** Load repo-root .env then run Prisma CLI (works in CMD and PowerShell). */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(cpRoot, "../..");
config({ path: path.join(repoRoot, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing. Copy .env.example to repo root .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const r = spawnSync("prisma", args, {
  cwd: cpRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(r.status ?? 1);
