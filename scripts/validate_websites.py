#!/usr/bin/env python3
"""HTTP-check provider websites; annotate JSON or drop clearly wrong entries."""

from __future__ import annotations

import concurrent.futures
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from provider_enrich import enrich_rows

from provider_cleanup import (
    apply_logos,
    dedupe_by_effective_domain,
    remove_inactive,
    remove_platform_wrappers,
    remove_redirect_duplicates,
    canonicalize_unique_redirects,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"
REPORT = ROOT / "scripts" / ".link-check-report.json"

UA = "sandbox-pricing-linkcheck/1.0 (research; contact: local)"

# Stale discovery/manual URLs → current vendor homepages (domain key without www).
KNOWN_URL_FIXES: dict[str, str] = {
    "nodus.computer": "https://www.nodus-compute.ai",
    "openpond.io": "https://openpond.ai",
    "paperpod.io": "https://www.paperpod.dev",
    "shellbox.sh": "https://shellbox.dev",
    "solari.run": "https://www.getsolari.com/sandboxes",
    "tama.sh": "https://tama.computer",
    "ppio.cloud": "https://ppio.com",
    "sandbox0.dev": "https://sandbox0.ai",
    "runta.sh": "https://runta.com",
    "sailboxes.dev": "https://www.sailresearch.com/sailboxes",
    "kedge.ws": "https://kedge.dev",
    "amika.ai": "https://www.amika.dev",
    "machine0.ai": "https://machine0.io",
    "yepcode.io": "https://yepcode.io/products/run",
    "deno.com": "https://deno.com/deploy/sandbox",
    "instabox.dev": "https://instabox.sh",
    "pandastack.io": "https://www.pandastack.ai",
    "mosaic.so": "https://sandbox.mosaicos.com",
    "omnirun.com": "https://omnirun.io",
    "agent37.dev": "https://www.agent37.com",
    "arker.com": "https://arker.ai",
    "coasty.com": "https://coasty.ai/platform/",
    "docs.deno.com": "https://deno.com/deploy/sandbox",
    "bluerock.io": "https://www.bluerock.io",
    "shardflux.com": "https://shardflux.dev",
    "scitix.com": "https://github.com/scitix/Agent-Sandbox",
    "seacloud.io": "https://github.com/SeaCloudAI/sandbox-python",
}


def apply_url_fixes(rows: list[dict]) -> int:
    fixed = 0
    for entry in rows:
        url = entry.get("website", "")
        if "yepcode.io" in url and "/products/run" in url:
            entry["website"] = "https://yepcode.io"
            entry.setdefault("sources", []).append("url-fix")
            fixed += 1
            continue
        dom = norm_domain(url)
        if dom in KNOWN_URL_FIXES:
            entry["website"] = KNOWN_URL_FIXES[dom]
            entry.setdefault("sources", []).append("url-fix")
            fixed += 1
        elif dom == "docs.deno.com" and "sandboxes" in entry.get("website", ""):
            entry["website"] = "https://deno.com/deploy/sandbox"
            entry.setdefault("sources", []).append("url-fix")
            fixed += 1
        elif dom == "yepcode.io" and "/products/run" in entry.get("website", ""):
            entry["website"] = "https://yepcode.io"
            entry.setdefault("sources", []).append("url-fix")
            fixed += 1
    return fixed

# Not vendor homepages — drop the row entirely.
DIRECTORY_DOMAIN = frozenset(
    {
        "agentsandboxes.fyi",
        "boxyard.dev",
        "sandboxindex.dev",
        "roost.guide",
        "infraforagents.com",
        "agentsandboxes.org",
        "theagentstack.dev",
    }
)


REMOVE_IF_WEBSITE_MATCHES = (
    "awesome.re/badge",
    "discord.gg",
    "discord.com/invite",
    "towardsdev.com",
    "youtube.com/watch",
    "designarena.ai",
    "obsidian.md/publish",
    "circleci.com/blog",
    "pleasedonotescape.com",
    "buttondown.com",
    "alive-bay.vercel.app",
    "europealternatives.com",
    "compare-index",
    "theagentstack.dev/guides",
    "prized.dev/blog",
    "huggingface.co/blog/",
    "agentsandbox.net",
    "computesdk.com",
    "vibekit.sh",
    "linkedin.com/in/",
    "linkedin.com/company/",
)

WEAK_ONLY_SOURCES = frozenset({"npm", "github", "pypi", "crates.io", "hn", "github-topic"})


def _weak_source_entry(entry: dict) -> bool:
    if entry.get("profile"):
        return False
    sources = entry.get("sources") or []
    for s in sources:
        low = s.lower()
        if low in ("web", "hosted", "manual", "infraforagents", "yc", "producthunt", "langchain-docs", "boxyard"):
            return False
        if low.startswith("agentsandboxes.fyi") or "roost" in low or "awesome" in low:
            return False
    # only npm/github/hn/topic/pypi style
    for s in sources:
        low = s.lower()
        if not any(low.startswith(p) for p in ("npm:", "github:", "github-topic:", "hn:", "pypi:", "crates.io:")):
            return False
    return bool(sources)


def check_one(url: str) -> dict:
    result: dict = {"input_url": url, "checked_at": datetime.now(timezone.utc).isoformat()}
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(
            url,
            method=method,
            headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                final = resp.geturl() or url
                code = getattr(resp, "status", None) or resp.getcode()
                result.update(
                    {
                        "website_status": "ok",
                        "http_status": code,
                        "final_url": final,
                        "method": method,
                    }
                )
                if norm_domain(final) != norm_domain(url):
                    result["website_status"] = "redirect"
                return result
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 401) and method == "HEAD":
                continue
            if e.code in (403, 401):
                result.update(
                    {
                        "website_status": "blocked",
                        "http_status": e.code,
                        "error": f"HTTP {e.code}",
                        "method": method,
                    }
                )
                return result
            if e.code == 404 and method == "GET":
                result.update(
                    {"website_status": "broken", "http_status": 404, "error": "HTTP 404", "method": method}
                )
                return result
            if method == "HEAD":
                continue
            result.update(
                {
                    "website_status": "broken",
                    "http_status": e.code,
                    "error": f"HTTP {e.code}",
                    "method": method,
                }
            )
            return result
        except urllib.error.URLError as e:
            reason = getattr(e, "reason", e)
            result.update({"website_status": "broken", "error": str(reason)[:240], "method": method})
            if method == "HEAD":
                continue
            return result
        except ssl.SSLError as e:
            result.update({"website_status": "broken", "error": f"SSL: {e}"[:240], "method": method})
            return result
        except Exception as e:
            result.update({"website_status": "broken", "error": str(e)[:240], "method": method})
            if method == "HEAD":
                continue
            return result
    result.setdefault("website_status", "broken")
    result.setdefault("error", "unreachable")
    return result


def norm_domain(url: str) -> str:
    if not url:
        return ""
    u = url.lower().rstrip("/")
    u = u.split("://", 1)[-1]
    return u.split("/")[0].removeprefix("www.")


def entry_rank(entry: dict) -> tuple:
    """Higher is better for deduplication."""
    status = entry.get("website_status", "")
    status_score = {"ok": 4, "redirect": 3, "blocked": 2, "broken": 0}.get(status, 0)
    profile = 10 if entry.get("profile") else 0
    sources = len(entry.get("sources") or [])
    return (profile, status_score, sources)


def dedupe_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """One row per registrable domain; keep best candidate."""
    by_domain: dict[str, list[dict]] = {}
    no_domain: list[dict] = []
    for e in rows:
        dom = norm_domain(e.get("website", ""))
        if not dom:
            no_domain.append(e)
            continue
        by_domain.setdefault(dom, []).append(e)
    kept: list[dict] = []
    dropped: list[dict] = []
    for dom, group in by_domain.items():
        group.sort(key=entry_rank, reverse=True)
        kept.append(group[0])
        for extra in group[1:]:
            dropped.append({**extra, "removed_reason": f"duplicate_domain:{dom}"})
    return kept + no_domain, dropped


def should_remove_row(entry: dict) -> str | None:
    url = (entry.get("website") or "").lower()
    dom = norm_domain(url)
    if dom in DIRECTORY_DOMAIN:
        return f"directory_site:{dom}"
    for pat in REMOVE_IF_WEBSITE_MATCHES:
        if pat in url:
            return f"wrong_url:{pat}"
    name = (entry.get("name") or "").lower()
    if name.startswith("@") and "pypi.org" in url:
        return "wrong_url:npm_package_as_vendor"
    if url.startswith("https://api.github.com"):
        return "wrong_url:api_url"
    return None


def main() -> None:
    rows: list[dict] = json.loads(OUT.read_text())
    nfix = apply_url_fixes(rows)
    if nfix:
        print(f"applied {nfix} known URL fixes")
    to_check = list({r.get("website", "") for r in rows if r.get("website", "").startswith("http")})
    print(f"checking {len(to_check)} unique URLs for {len(rows)} providers")

    checks: dict[str, dict] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        for url, check in zip(to_check, pool.map(check_one, to_check)):
            checks[url] = check

    removed: list[dict] = []
    kept: list[dict] = []
    stats = {"ok": 0, "redirect": 0, "blocked": 0, "broken": 0, "removed": 0}

    for entry in rows:
        reason = should_remove_row(entry)
        if reason:
            removed.append({**entry, "removed_reason": reason})
            stats["removed"] += 1
            continue

        url = entry.get("website", "")
        check = checks.get(url) or {"website_status": "broken", "error": "no_url"}
        status = check.get("website_status", "broken")
        entry["website_status"] = status
        entry["website_check"] = {
            k: v for k, v in check.items() if k not in ("website_status",)
        }

        if status == "broken" and (_weak_source_entry(entry) or (entry.get("sources") or []) == ["Web"]):
            removed.append({**entry, "removed_reason": "broken_link_weak_source"})
            stats["removed"] += 1
            continue

        if status in stats:
            stats[status] += 1
        kept.append(entry)

    kept, rm_inactive = remove_inactive(kept)
    stats["removed"] += len(rm_inactive)
    removed.extend(rm_inactive)

    kept, rm_wrappers = remove_platform_wrappers(kept)
    stats["removed"] += len(rm_wrappers)
    removed.extend(rm_wrappers)

    kept, rm_redirect = remove_redirect_duplicates(kept)
    stats["removed"] += len(rm_redirect)
    removed.extend(rm_redirect)

    n_canon = canonicalize_unique_redirects(kept)
    if n_canon:
        print(f"canonicalized {n_canon} same-vendor redirect URLs")

    kept, deduped_domain = dedupe_by_effective_domain(kept, entry_rank)
    by_slug: dict[str, list[dict]] = {}
    for e in kept:
        slug = (e.get("slug") or norm_domain(e.get("website", ""))).lower()
        by_slug.setdefault(slug, []).append(e)
    slug_kept: list[dict] = []
    deduped_slug: list[dict] = []
    for slug, group in by_slug.items():
        group.sort(key=entry_rank, reverse=True)
        slug_kept.append(group[0])
        for extra in group[1:]:
            deduped_slug.append({**extra, "removed_reason": f"duplicate_slug:{slug}"})
    kept = slug_kept
    deduped = deduped_domain + deduped_slug
    stats["removed"] += len(deduped)
    removed.extend(deduped)

    apply_logos(kept)

    kept, rm_vendor = enrich_rows(kept)
    stats["removed"] += len(rm_vendor)
    removed.extend(rm_vendor)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(kept, indent=2))
    REPORT.write_text(
        json.dumps(
            {
                "checked_at": datetime.now(timezone.utc).isoformat(),
                "stats": stats,
                "removed_count": len(removed),
                "removed": removed,
            },
            indent=2,
        )
    )
    print(f"kept={len(kept)} removed={len(removed)} stats={stats} -> {OUT}")
    print(f"report -> {REPORT}")


if __name__ == "__main__":
    main()