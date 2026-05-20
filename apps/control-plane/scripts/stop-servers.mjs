#!/usr/bin/env node
/** Stop Node processes listening on DPE dev ports (Windows). */
import { execSync } from "node:child_process";

const ports = [3001, 3002, 3003, 3099, 5173];

for (const port of ports) {
  try {
    const out = execSync(
      `netstat -ano | findstr ":${port} " | findstr LISTENING`,
      { encoding: "utf8", shell: true },
    );
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/\s+(\d+)\s*$/);
      if (m) pids.add(m[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", shell: true });
        console.log(`stopped PID ${pid} (port ${port})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* no listener */
  }
}
