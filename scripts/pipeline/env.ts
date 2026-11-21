import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (`sandbox-pricing/`). */
export const repoRoot = path.resolve(scriptsDir, "../..");

export function requireFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY is required. Copy .env.example → .env and add your key.",
    );
  }
  return key;
}