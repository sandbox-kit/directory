import type { JsonSchema } from "../firecrawl/schemas.ts";

export const PROVIDER_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    providers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          website: { type: "string" },
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
          sandbox_capabilities: {
            type: "array",
            items: {
              type: "string",
              description:
                "linux | windows | macos | browser | desktop | microvm | container | gvisor | wasm | ci | gpu | mobile | edge",
            },
          },
          isolation_technologies: {
            type: "array",
            items: {
              type: "string",
              description:
                "firecracker | gvisor | container | docker | kvm | hyperv | cloud_hypervisor | kata | webcontainers | wasm_isolate | browser_isolation | apple_virtualization | sysbox | runc | virtual_desktop | remote_browser | managed_runtime",
            },
          },
          logo_url: {
            type: "string",
            description:
              "Absolute URL to official product logo or high-res favicon",
          },
          docs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "What this URL covers",
                },
                link: { type: "string", description: "HTTPS documentation URL" },
              },
              required: ["description", "link"],
            },
          },
        },
        required: ["name", "website"],
      },
    },
  },
  required: ["providers"],
} as const satisfies JsonSchema;
