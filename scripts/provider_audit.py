"""Audit providers: drop non-sandbox URLs, pivoted products, and junk discoveries."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import urllib.request
from pathlib import Path

from provider_enrich import norm_domain

UA = "sandbox-pricing-audit/1.0"

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"
REPORT = ROOT / "scripts" / ".provider-audit-report.json"

NON_PROVIDER_URL_RE = re.compile(
    r"""
    pypi\.org/project/|
    crates\.io/crates/|
    /posts/|
    claydon\.co|
    comparesandboxes\.com|
    /internals/architecture|
    towardsdev\.com|
    medium\.com/|
    substack\.com/|
    vercel\.app/blog|
    awesome\.re/|
    discord\.gg|
    youtube\.com/watch|
    linkedin\.com/|
    creativecommons\.org
    """,
    re.I | re.X,
)

NON_SANDBOX_DOMAINS = frozenset(
    {
        "developer.mastercard.com",
        "developer.visa.com",
        "shopify.dev",
        "developer.servicenow.com",
        "www.huaweicloud.com",
        "huaweicloud.com",
        "nebius.com",
        "docs.langchain.com",
        "byteplus.com",
        "www.twilio.com",
        "twilio.com",
    }
)

CURATED_SOURCE_MARKERS = (
    "agentsandboxes.org",
    "agentsandboxes.fyi",
    "infraforagents",
    "sandboxindex",
    "boxyard",
    "langchain-docs",
    "roost-map",
    "manual",
)

STRONG_PIVOT_PHRASES = (
    "no longer available",
    "product has been discontinued",
    "service has been discontinued",
    "we've shut down",
    "we shut down",
    "has shut down",
    "sunsetted",
    "sunsetting this product",
    "we sunset",
    "this service is discontinued",
    "we pivoted to",
    "we've pivoted to",
    "domain is for sale",
    "buy this domain",
    "permanently closed",
)

BLOCKLIST_SLUGS = frozenset(
    {
        "cathedral",
        "ai-sandboxes",
        "architecture",
        "comparesandboxes-com",
        "nanobox",
        "ai-code-sandbox",
        "aria-agent-sandbox",
        "cc-by-4-0",
        "mastercard",
        "visa",
        "shopify-dev-stores",
        "twilio-test-credentials",
        "servicenow-pdi",
        "huawei-agentarts",
        "nebius-token-factory",
        "databricks",
        "byteplus-cloud-sandbox",
        "scrapybara-docs-redirect-to-capy",
        "show-hn-i-built-a-smart-proxy-so-your-coding-agent-can-run-loose",
        "jilebi",
        "declaw",
    }
)


def _has_curated_source(entry: dict) -> bool:
    blob = " ".join(entry.get("sources") or []).lower()
    return any(m in blob for m in CURATED_SOURCE_MARKERS)


def static_audit_reason(entry: dict) -> str | None:
    slug = (entry.get("slug") or "").lower()
    if slug in BLOCKLIST_SLUGS:
        return f"blocklist_slug:{slug}"

    url = (entry.get("website") or "").strip()
    if not url:
        return "missing_website"

    dom = norm_domain(url)
    if dom in NON_SANDBOX_DOMAINS:
        return f"non_sandbox_domain:{dom}"

    if NON_PROVIDER_URL_RE.search(url):
        return "non_provider_url"

    return None


def fetch_homepage_text(url: str, timeout: float = 14.0) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(200_000).decode("utf-8", errors="ignore")
            text = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", raw, flags=re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            return re.sub(r"\s+", " ", text).strip().lower()[:40_000]
    except Exception:
        return ""


def pivot_audit_reason(entry: dict, text: str) -> str | None:
    if not text:
        return None
    for phrase in STRONG_PIVOT_PHRASES:
        if phrase in text:
            if entry.get("profile") or _has_curated_source(entry):
                return f"pivot_content:{phrase}"
            if entry.get("extra") and not (entry.get("category_guess") or "").startswith("Other"):
                return f"pivot_content:{phrase}"
            if entry.get("extra"):
                return f"pivot_content:{phrase}"
    return None


def audit_rows(
    rows: list[dict],
    *,
    workers: int = 12,
    scan_pivot: bool = False,
) -> tuple[list[dict], list[dict], list[dict]]:
    removed: list[dict] = []
    details: list[dict] = []
    kept: list[dict] = []
    to_scan: list[dict] = []

    for entry in rows:
        static = static_audit_reason(entry)
        if static:
            removed.append({**entry, "removed_reason": static})
            details.append({"slug": entry.get("slug"), "reason": static, "static": True})
        elif scan_pivot:
            to_scan.append(entry)
        else:
            kept.append(entry)

    if scan_pivot and to_scan:

        def work(entry: dict) -> tuple[dict, str | None]:
            text = fetch_homepage_text(entry.get("website") or "")
            return entry, pivot_audit_reason(entry, text)

        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            for entry, reason in pool.map(work, to_scan):
                if reason:
                    removed.append({**entry, "removed_reason": reason})
                    details.append({"slug": entry.get("slug"), "reason": reason})
                else:
                    kept.append(entry)

    kept.sort(key=lambda x: (x.get("name") or "").lower())
    return kept, removed, details


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scan-pivot",
        action="store_true",
        help="Fetch homepages for shutdown/pivot phrases (slower; may need manual review).",
    )
    args = parser.parse_args()

    rows: list[dict] = json.loads(OUT.read_text())
    kept, removed, details = audit_rows(rows, scan_pivot=args.scan_pivot)
    OUT.write_text(json.dumps(kept, indent=2) + "\n")
    REPORT.write_text(
        json.dumps(
            {
                "kept": len(kept),
                "removed": len(removed),
                "scan_pivot": args.scan_pivot,
                "removed_entries": [
                    {
                        "slug": r.get("slug"),
                        "name": r.get("name"),
                        "website": r.get("website"),
                        "reason": r.get("removed_reason"),
                    }
                    for r in removed
                ],
                "details": details,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"kept={len(kept)} removed={len(removed)} -> {OUT}")
    print(f"report -> {REPORT}")


if __name__ == "__main__":
    main()