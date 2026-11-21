import { CAPABILITY_EXTRACT_HINT } from "./capability-prompt.ts";
import { ISOLATION_EXTRACT_HINT } from "./isolation-prompt.ts";
import { DOCS_EXTRACT_HINT } from "./docs-prompt.ts";

export const PROVIDER_EXTRACT_PROMPT =
  "Extract AI agent sandbox offerings: products or projects where untrusted/agent code runs isolated (code execution, browser/VM/computer-use sandboxes for LLM agents). " +
  "Include ALL of the following when present on the page: " +
  "(1) Commercial or hosted SaaS sandboxes, " +
  "(2) Open-source or self-hosted sandbox platforms and org-maintained GitHub projects (not tiny personal demos — prefer repos with clear product intent, orgs, or community adoption), " +
  "(3) Hybrid (hosted + self-hosted), " +
  "(4) Stealth, waitlist, private-beta, or pre-launch sandboxes that are mentioned publicly (landing pages, HN, blogs) even without full pricing. " +
  "For each entry: name, canonical URL (homepage or main GitHub repo), offering_type (hosted|oss|hybrid|stealth|unknown), availability (public|private-beta|self-hosted|stealth|waitlist|unknown), launch_stage (ga|beta|alpha|pre-launch|unknown). " +
  CAPABILITY_EXTRACT_HINT +
  " " +
  ISOLATION_EXTRACT_HINT +
  " " +
  DOCS_EXTRACT_HINT +
  " " +
  "Exclude: pure directories/comparison sites, marketplaces, underlying runtimes only (Firecracker, gVisor, Kata, Wasmtime docs with no agent product), and unrelated dev tools — but include CI sandbox products that market ephemeral isolated environments for agents.";

export const YC_PROVIDER_EXTRACT_PROMPT =
  "From this Y Combinator company directory or batch listing, extract startups whose PRIMARY product is an AI agent sandbox, secure code execution for LLM/coding agents, browser or computer-use isolation, ephemeral dev environments for agents, or MCP-hosted untrusted code. " +
  "For each company: official product name, canonical website (company domain — not ycombinator.com/companies/... unless no public site yet), offering_type, availability, launch_stage. " +
  "Skip generic B2B SaaS, observability-only, pure LLM APIs without isolation, and devtools unrelated to sandboxes. Include infra that clearly markets microVM/WASM/container isolation for agent workloads. " +
  CAPABILITY_EXTRACT_HINT +
  " " +
  ISOLATION_EXTRACT_HINT +
  " " +
  DOCS_EXTRACT_HINT;
