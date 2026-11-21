import { normDomain } from "../providers/excludes.ts";
import type { SourceKind, SourceYield } from "./types.ts";

const VENDOR_HOME_BLOCK = new Set([
  "e2b.dev",
  "modal.com",
  "daytona.io",
  "browserbase.com",
]);

const LIST_SIGNAL =
  /directory|catalog|index|list|awesome|providers|integrations|comparison|compare|roundup|show hn|sandboxes|landscape/i;

const SANDBOX_SIGNAL =
  /sandbox|agent|code execution|microvm|mcp|code interpreter|browser sandbox/i;

const SINGLE_VENDOR_DOC = /\/pricing$|\/signup$|\/login$|\/app$|\/dashboard$/i;

export type SourceScoreInput = {
  url: string;
  title: string;
  description?: string;
  kind?: SourceKind;
  likelyProviderCount?: string;
};

export function inferSourceKind(url: string, title: string): SourceKind {
  const low = `${url} ${title}`.toLowerCase();
  if (low.includes("news.ycombinator.com") || low.includes("show hn")) {
    return "hackernews";
  }
  if (url.includes("github.com")) return "github";
  if (url.includes("docs.") || url.includes("/docs/")) return "docs";
  if (
    url.includes("linkedin.com") ||
    url.includes("x.com") ||
    low.includes("twitter.com")
  ) {
    return "social";
  }
  if (LIST_SIGNAL.test(low) && /compare|versus|vs\b/.test(low))
    return "comparison";
  if (/integrations|partners/.test(low)) return "integrations";
  if (/blog\.|medium\.com|substack\.com|dev\.to/.test(low)) return "blog";
  return "directory";
}

export function scoreSourceCandidate(input: SourceScoreInput): number {
  const blob =
    `${input.title} ${input.description ?? ""} ${input.url}`.toLowerCase();
  let score = 0;

  if (SANDBOX_SIGNAL.test(blob)) score += 0.35;
  if (LIST_SIGNAL.test(blob)) score += 0.3;

  const host = normDomain(input.url);
  if (VENDOR_HOME_BLOCK.has(host)) score -= 0.6;
  if (SINGLE_VENDOR_DOC.test(input.url)) score -= 0.4;

  if (input.likelyProviderCount === "high") score += 0.25;
  else if (input.likelyProviderCount === "medium") score += 0.15;
  else if (input.likelyProviderCount === "low") score += 0.05;

  const kind = input.kind ?? inferSourceKind(input.url, input.title);
  if (kind === "directory" || kind === "comparison" || kind === "github") {
    score += 0.1;
  }
  if (kind === "hackernews" && LIST_SIGNAL.test(blob)) score += 0.12;
  if (kind === "blog" && LIST_SIGNAL.test(blob) && SANDBOX_SIGNAL.test(blob)) {
    score += 0.08;
  }
  if (kind === "social" && !LIST_SIGNAL.test(blob)) score -= 0.2;

  return Math.min(1, Math.max(0, score));
}

export function qualifiesAsProviderSource(input: SourceScoreInput): boolean {
  return scoreSourceCandidate(input) >= 0.55;
}

export function yieldFromScore(score: number): SourceYield {
  if (score >= 0.75) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

export function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").split(".")[0] ?? "source";
    const path = u.pathname
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const base = path && path !== "index" ? `${host}-${path}` : host;
    return base.toLowerCase().slice(0, 64);
  } catch {
    return "source";
  }
}
