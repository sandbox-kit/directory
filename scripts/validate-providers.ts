import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findInventoryDuplicates } from "@/lib/dedupe-providers";
import {
  formatProviderParseError,
  sandboxProvidersSchema,
} from "@/schemas/provider";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventory = path.join(root, "public", "agent-sandbox-providers.json");

let raw: string;
try {
  raw = readFileSync(inventory, "utf8");
} catch {
  console.error(
    `Missing ${path.relative(root, inventory)} — run npm run sync:providers first.`,
  );
  process.exit(1);
}

let json: unknown;
try {
  json = JSON.parse(raw);
} catch {
  console.error("public/agent-sandbox-providers.json is not valid JSON");
  process.exit(1);
}

const parsed = sandboxProvidersSchema.safeParse(json);
if (!parsed.success) {
  console.error(`Validation failed: ${formatProviderParseError(parsed.error)}`);
  process.exit(1);
}

const dupes = findInventoryDuplicates(parsed.data);
const problems = [
  ...dupes.duplicateSlugs.map((slug) => `duplicate slug: ${slug}`),
  ...dupes.duplicateHostKeys.map((host) => `duplicate host key: ${host}`),
  ...dupes.duplicateVendorKeys.map(
    (vendor) => `duplicate vendor key: ${vendor}`,
  ),
];
if (problems.length > 0) {
  for (const msg of problems) console.error(msg);
  console.error(
    "Inventory has duplicate providers — re-run sync:providers or dedupe before merge.",
  );
  process.exit(1);
}

console.log(
  `validated public/agent-sandbox-providers.json (${parsed.data.length} providers, no duplicates)`,
);
