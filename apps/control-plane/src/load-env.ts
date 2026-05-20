import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(cpRoot, "../..");
config({ path: path.join(repoRoot, ".env") });
