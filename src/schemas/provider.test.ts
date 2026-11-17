import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { providerHostKey } from "@/lib/dedupe-providers";
import {
  sandboxProviderSchema,
  sandboxProvidersSchema,
} from "@/schemas/provider";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("sandboxProvidersSchema", () => {
  it("parses public/agent-sandbox-providers.json", () => {
    const raw = readFileSync(
      join(repoRoot, "public", "agent-sandbox-providers.json"),
      "utf8",
    );
    const json: unknown = JSON.parse(raw);
    const result = sandboxProvidersSchema.safeParse(json);
    expect(result.success).toBe(true);
    if (result.success) {
      const hosts = new Set(result.data.map((p) => providerHostKey(p)));
      expect(result.data.length).toBe(hosts.size);
      expect(result.data.length).toBeGreaterThan(200);
    }
  });

  it("rejects entries missing required fields", () => {
    const result = sandboxProviderSchema.safeParse({
      slug: "x",
      name: "X",
    });
    expect(result.success).toBe(false);
  });
});
