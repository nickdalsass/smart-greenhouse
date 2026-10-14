import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** ponytail: no dotenv dep — load backend/.env if present */
export function loadEnv(): void {
  const envPath = resolve(import.meta.dirname, "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] != null) continue;
    process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
