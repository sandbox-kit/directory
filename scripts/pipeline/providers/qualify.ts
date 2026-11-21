import { isExcluded, normDomain } from "./excludes.ts";

const DIRECTORY_MARKETPLACE_HOSTS = new Set([
  "producthunt.com",
  "alternativeto.net",
  "stackshare.io",
  "saashub.com",
  "g2.com",
  "capterra.com",
  "getapp.com",
  "slashdot.org",
  "news.ycombinator.com",
  "reddit.com",
  "medium.com",
  "substack.com",
  "dev.to",
  "hashnode.dev",
  "wikipedia.org",
  "github.com/sindresorhus/awesome",
]);

const DIRECTORY_URL_MARKERS = [
  "/marketplace",
  "aws.amazon.com/marketplace",
  "github.com/marketplace",
  "github.com/topics/",
  "github.com/collections/",
  "awesome-",
  "compare",
  "comparisons",
  "versus",
  "/blog/",
  "buttondown.email",
  "googletagmanager",
] as const;

const UNDERLYING_TECH_MARKERS = [
  "firecracker-microvm",
  "gvisor.dev",
  "wasmtime.dev",
  "wasmer.io",
  "kata-containers",
  "bubblewrap",
  "libkrun",
  "kubernetes.io/docs",
  "kubernetes.io/blog",
  "docs.docker.com/engine",
  "opencontainers.org",
  "qemu.org",
  "intel.com/content/www/us/en/developer/tools/software-guard",
] as const;

const NAME_DIRECTORY_MARKETPLACE_RE =
  /\b(awesome|comparison|compare|benchmark|marketplace|directory|catalog|index|curated list|alternative to|vs\.?)\b/i;

const NAME_UNDERLYING_TECH_RE =
  /^(Firecracker|gVisor|Wasmtime|Wasmer|Kata Containers|Bubblewrap|libkrun|Pyodide|containerd|runc|QEMU)\b/i;

const SANDBOX_SIGNAL =
  /sandbox|microvm|code[- ]?interpreter|code execution|agentcore|sprites|sandboxes|browserbase|untrusted code|computer use|codebox/i;

const AGENT_PRODUCT_SIGNAL =
  /\b(agent|llm|ai\b|mcp|coding agent|interpreter|e2b|daytona|modal|agentic)\b/i;

const LOOSE_LIST_SOURCES = /^firecrawl:/i;

/** Vendor homepages that do not always say “sandbox” in the URL. */
const KNOWN_SANDBOX_VENDOR_HOSTS = new Set([
  "e2b.dev",
  "modal.com",
  "daytona.io",
  "browserbase.com",
  "steel.dev",
  "scrapybara.com",
  "blaxel.ai",
  "fly.io",
  "render.com",
  "northflank.com",
  "beam.cloud",
  "freestyle.sh",
  "cloudflare.com",
  "vercel.com",
  "railway.com",
  "runpod.io",
  "together.ai",
]);

export type QualifyOptions = {
  sources?: string[];
  offering_type?: string;
  availability?: string;
};

function hostBlocked(url: string): boolean {
  const host = normDomain(url);
  if (!host) return true;
  if (DIRECTORY_MARKETPLACE_HOSTS.has(host)) return true;
  for (const blocked of DIRECTORY_MARKETPLACE_HOSTS) {
    if (blocked.includes("/") && url.toLowerCase().includes(blocked))
      return true;
  }
  const catalogHosts = [
    "agentsandboxes.org",
    "agentsandboxes.fyi",
    "boxyard.dev",
    "sandboxindex.dev",
    "sandbox.directory",
    "infraforagents.com",
    "roost.guide",
    "comparesandboxes.com",
    "pleasedonotescape.com",
  ];
  return catalogHosts.includes(host);
}

function urlLooksLikeDocsOnly(url: string, name: string): boolean {
  const low = url.toLowerCase();
  const blob = `${name} ${url}`.toLowerCase();

  if (UNDERLYING_TECH_MARKERS.some((m) => low.includes(m))) {
    return !SANDBOX_SIGNAL.test(blob);
  }

  try {
    const { pathname } = new URL(url);
    const path = pathname.toLowerCase();
    const docHeavy =
      path.includes("/docs/") ||
      path.includes("/documentation/") ||
      path.endsWith("/docs") ||
      path.includes("/reference/api");
    if (docHeavy && !SANDBOX_SIGNAL.test(blob) && !path.includes("sandbox")) {
      return true;
    }
  } catch {
    return true;
  }

  return DIRECTORY_URL_MARKERS.some((m) => low.includes(m));
}

function passesKeywordGate(name: string, url: string): boolean {
  const blob = `${name} ${url}`.toLowerCase();
  if (SANDBOX_SIGNAL.test(blob)) {
    return AGENT_PRODUCT_SIGNAL.test(blob) || /\/sandboxes?\b/i.test(url);
  }
  try {
    const { pathname } = new URL(url);
    if (/\/sandboxes?(\/|$)/i.test(pathname)) {
      return (
        AGENT_PRODUCT_SIGNAL.test(blob) || /agent|code|browser/i.test(pathname)
      );
    }
  } catch {
    /* ignore */
  }
  return false;
}

const OSS_REPO_SIGNAL =
  /sandbox|microsandbox|agent-sandbox|code-interpreter|opensandbox|sandock|containarium|untrusted|computer-use|kata-agent/i;

const STEALTH_PAGE_SIGNAL =
  /waitlist|private beta|early access|coming soon|stealth|pre-launch|request access|join the beta|invite only/i;

function isGithubTopicsPage(url: string): boolean {
  return /github\.com\/topics\//i.test(url);
}

function isYcCompanyPage(url: string): boolean {
  return /ycombinator\.com\/companies\/[^/?#]+/i.test(url);
}

function fromYcOrMentionDiscovery(sources: string[] | undefined): boolean {
  if (!sources?.length) return false;
  return sources.some(
    (s) =>
      s.startsWith("mention:") ||
      s === "discovery:mention" ||
      /^yc:/i.test(s) ||
      /ycombinator\.com\/companies/i.test(s) ||
      /^firecrawl:yc-/i.test(s),
  );
}

function isOssSandboxRepo(url: string, name: string): boolean {
  if (!url.includes("github.com/") || isGithubTopicsPage(url)) return false;
  const repo =
    url.match(/github\.com\/([^/]+\/[^/#?]+)/i)?.[1]?.toLowerCase() ?? "";
  if (!repo.includes("/")) return false;
  if (repo.includes("awesome")) return false;
  const blob = `${name} ${url} ${repo}`.toLowerCase();
  return (
    OSS_REPO_SIGNAL.test(blob) &&
    /\b(agent|llm|mcp|coding|interpreter)\b/.test(blob)
  );
}

function isStealthOrEarlySandbox(
  url: string,
  name: string,
  options: QualifyOptions,
): boolean {
  const blob = `${name} ${url}`.toLowerCase();
  const meta =
    `${options.offering_type ?? ""} ${options.availability ?? ""}`.toLowerCase();
  if (meta.includes("stealth") || meta.includes("waitlist")) {
    return SANDBOX_SIGNAL.test(blob) || STEALTH_PAGE_SIGNAL.test(blob);
  }
  return (
    STEALTH_PAGE_SIGNAL.test(blob) &&
    (SANDBOX_SIGNAL.test(blob) || AGENT_PRODUCT_SIGNAL.test(blob))
  );
}

function strictListSource(sources: string[] | undefined): boolean {
  if (!sources?.length) return false;
  return sources.every((s) => LOOSE_LIST_SOURCES.test(s));
}

/** True when the row is a vendor product, not a catalog/docs/marketplace link. */
export function qualifiesAgentSandbox(
  name: string,
  url: string,
  options: QualifyOptions = {},
): boolean {
  const trimmedName = name.trim();
  if (!trimmedName || !url.startsWith("http")) return false;
  if (isExcluded(url, trimmedName)) return false;
  if (NAME_UNDERLYING_TECH_RE.test(trimmedName)) return false;
  if (NAME_DIRECTORY_MARKETPLACE_RE.test(trimmedName)) return false;
  if (hostBlocked(url)) return false;
  if (isGithubTopicsPage(url)) return false;

  const host = normDomain(url);
  if (KNOWN_SANDBOX_VENDOR_HOSTS.has(host)) return true;

  if (isYcCompanyPage(url)) {
    const blob = `${trimmedName} ${url}`.toLowerCase();
    if (SANDBOX_SIGNAL.test(blob) || AGENT_PRODUCT_SIGNAL.test(blob)) {
      return true;
    }
    if (fromYcOrMentionDiscovery(options.sources)) {
      return passesKeywordGate(trimmedName, url);
    }
  }

  if (isOssSandboxRepo(url, trimmedName)) return true;
  if (isStealthOrEarlySandbox(url, trimmedName, options)) return true;

  if (urlLooksLikeDocsOnly(url, trimmedName)) return false;

  const githubRepo = url.match(/github\.com\/([^/]+\/[^/#?]+)/i);
  if (githubRepo) {
    const repo = githubRepo[1]?.toLowerCase() ?? "";
    if (
      repo.startsWith("awesome-") ||
      repo.endsWith("-awesome") ||
      repo.includes("awesome-")
    ) {
      return false;
    }
  }

  const listOnly = strictListSource(options.sources);
  if (listOnly && !passesKeywordGate(trimmedName, url)) return false;

  return passesKeywordGate(trimmedName, url);
}

export type InventoryRow = {
  name: string;
  website: string;
  profile?: string | null;
  sources?: string[];
};

/** Keep curated vendor profiles; drop catalog noise from sync. */
export function keepInventoryRow(row: InventoryRow): boolean {
  const profile = row.profile ?? "";
  if (
    profile.includes("agentsandboxes.org/sandboxes/") &&
    !hostBlocked(row.website)
  ) {
    return true;
  }

  return qualifiesAgentSandbox(row.name, row.website, {
    sources: row.sources,
  });
}
