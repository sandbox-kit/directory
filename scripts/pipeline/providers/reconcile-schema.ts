import type { JsonSchema } from "../firecrawl/schemas.ts";
import { CAPABILITY_EXTRACT_HINT } from "./capability-prompt.ts";
import { ISOLATION_EXTRACT_HINT } from "./isolation-prompt.ts";
import { DOCS_EXTRACT_HINT } from "./docs-prompt.ts";

export const RECONCILE_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    is_agent_sandbox: {
      type: "boolean",
      description:
        "True if this company/project still offers an AI agent sandbox (code/browser/VM isolation for agents).",
    },
    provider_status: {
      type: "string",
      description: "active | pivoted | shutdown | inactive | unknown",
    },
    canonical_website: {
      type: "string",
      description:
        "Correct official homepage URL if different from the page scraped",
    },
    name: { type: "string", description: "Current product or company name" },
    evidence: {
      type: "string",
      description: "One sentence why this status was chosen",
    },
    sandbox_capabilities: {
      type: "array",
      items: {
        type: "string",
        description:
          "linux | windows | macos | browser | desktop | microvm | container | gvisor | wasm | ci | gpu | mobile | edge",
      },
    },
    offering_type: {
      type: "string",
      description: "hosted | oss | hybrid | stealth | unknown",
    },
    availability: {
      type: "string",
      description:
        "public | private-beta | self-hosted | stealth | waitlist | unknown",
    },
    launch_stage: {
      type: "string",
      description: "ga | beta | alpha | pre-launch | unknown",
    },
    isolation_technologies: {
      type: "array",
      items: { type: "string" },
    },
    logo_url: { type: "string" },
    docs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          link: { type: "string" },
        },
        required: ["description", "link"],
      },
    },
  },
  required: ["is_agent_sandbox", "provider_status"],
} as const satisfies JsonSchema;

export type ReconcileExtract = {
  is_agent_sandbox?: boolean;
  provider_status?: string;
  canonical_website?: string;
  name?: string;
  evidence?: string;
  sandbox_capabilities?: string[];
  offering_type?: string;
  availability?: string;
  launch_stage?: string;
  isolation_technologies?: string[];
  logo_url?: string;
  docs?: { description?: string; link?: string }[];
};

export const RECONCILE_PROMPT =
  "You are verifying an AI agent sandbox provider for a public directory. " +
  "Determine whether this URL still represents an ACTIVE agent sandbox product (hosted, OSS, or hybrid). " +
  "If the company pivoted away from sandboxes, shut down, or the URL is wrong, say so. " +
  "If the listing used a stale URL, return the canonical_website (homepage or main GitHub repo). " +
  "Return current offering_type, availability, and launch_stage when the product is still listed. " +
  "Do not treat underlying runtimes (Firecracker/gVisor) or generic cloud docs as sandboxes. " +
  CAPABILITY_EXTRACT_HINT +
  " " +
  ISOLATION_EXTRACT_HINT +
  " " +
  DOCS_EXTRACT_HINT;
