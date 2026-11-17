"""Dedupe redirects, drop platform wrappers, inactive sandboxes; attach logo URLs."""

from __future__ import annotations

import re
from urllib.parse import urlparse

# Canonical inventory slugs for hosted sandbox platforms (not npm wrappers).
PLATFORM_CANONICAL_SLUGS = frozenset(
    {
        "e2b",
        "daytona",
        "modal-sandboxes",
        "browserbase",
        "cloudflare-sandbox-sdk",
        "fly-io-sprites",
        "anthropic-code-execution",
        "docker-sandboxes",
        "beam",
        "vercel-sandbox",
        "runloop",
        "scrabble",
    }
)

_WRAPPER_SLUG_RE = re.compile(
    r"^(?:.+[-/])?(?:sandbox[-_])?(?:e2b|daytona|modal|browserbase|browser-use|cloudflare)(?:[-_].+)?$",
    re.I,
)

INACTIVE_URL_SUBSTR = (
    "shut-down",
    "shutdown",
    "sunset",
    "discontinued",
    "no-longer-available",
    "we-recently-shut",
    "product-has-been-retired",
    "is-now-closed",
)

INACTIVE_SLUGS = frozenset(
    {
        "forevervm",
        "show-hn-tilde-run",
        "tilde-run",
        "openhands-daytona",
        "cathedral",  # cathedral.sh — not an agent sandbox product (roost mis-map)
        "ai-sandboxes",
        "comparesandboxes-com",
        "scrapybara-docs-redirect-to-capy",
        "jilebi",
        "declaw",
    }
)


def norm_domain(url: str) -> str:
    if not url:
        return ""
    u = url.lower().rstrip("/")
    u = u.split("://", 1)[-1]
    return u.split("/")[0].removeprefix("www.")


def effective_domain(entry: dict) -> str:
    check = entry.get("website_check") or {}
    final = check.get("final_url") or entry.get("website") or ""
    return norm_domain(final)


def logo_url_for(entry: dict) -> str:
    dom = effective_domain(entry) or norm_domain(entry.get("website", ""))
    if not dom:
        return ""
    # DuckDuckGo tends to return real favicons; Google often serves flat black tiles.
    return f"https://icons.duckduckgo.com/ip3/{dom}.ico"


def canonicalize_unique_redirects(rows: list[dict]) -> int:
    """Point remaining redirects at their final URL when no other row owns that domain."""
    updated = 0
    primary_domains = {
        norm_domain(e.get("website", ""))
        for e in rows
        if e.get("website_status") != "redirect"
    }
    for entry in rows:
        if entry.get("website_status") != "redirect":
            continue
        check = entry.get("website_check") or {}
        final = (check.get("final_url") or "").strip()
        if not final:
            continue
        final_dom = norm_domain(final)
        if final_dom in primary_domains:
            continue
        entry["website"] = final.split("?")[0].rstrip("/")
        entry["website_status"] = "ok"
        check["input_url"] = entry["website"]
        updated += 1
        primary_domains.add(final_dom)
    return updated


def apply_logos(rows: list[dict]) -> None:
    """Set DuckDuckGo default only when logo_url missing (use resolve_logos.py for real URLs)."""
    for entry in rows:
        if entry.get("logo_url"):
            continue
        url = logo_url_for(entry)
        if url:
            entry["logo_url"] = url


def is_platform_wrapper(entry: dict, slug_set: frozenset[str]) -> str | None:
    slug = (entry.get("slug") or "").lower()
    if slug in PLATFORM_CANONICAL_SLUGS:
        return None
    name = (entry.get("name") or "").lower()
    if slug.endswith("-e2b") or slug.endswith("-sandbox-e2b"):
        if "e2b" in slug_set:
            return "platform_wrapper:e2b"
    for platform in PLATFORM_CANONICAL_SLUGS:
        if slug == platform:
            continue
        if slug.endswith(f"-{platform}") or slug.startswith(f"{platform}-"):
            if platform in slug_set:
                return f"platform_wrapper:{platform}"
    if _WRAPPER_SLUG_RE.match(slug) and any(p in slug_set for p in PLATFORM_CANONICAL_SLUGS):
        if "e2b" in slug and "e2b" in slug_set:
            return "platform_wrapper:e2b"
    if name.startswith("@") and any(
        p in name for p in ("/e2b", "sandbox-e2b", "daytona", "modal")
    ):
        for platform in ("e2b", "daytona", "modal"):
            if platform in name and platform in slug_set:
                return f"platform_wrapper:npm_{platform}"
    sources = " ".join(entry.get("sources") or []).lower()
    if "npm:" in sources and slug.endswith("-e2b") and "e2b" in slug_set:
        return "platform_wrapper:npm_e2b"
    return None


def inactive_reason(entry: dict) -> str | None:
    slug = (entry.get("slug") or "").lower()
    if slug in INACTIVE_SLUGS:
        return f"inactive_slug:{slug}"
    check = entry.get("website_check") or {}
    blob = " ".join(
        [
            entry.get("website") or "",
            check.get("final_url") or "",
            entry.get("name") or "",
        ]
    ).lower()
    for pat in INACTIVE_URL_SUBSTR:
        if pat in blob:
            return f"inactive:{pat}"
    if entry.get("website_status") == "redirect":
        final_dom = effective_domain(entry)
        input_dom = norm_domain(entry.get("website", ""))
        if final_dom in ("modal.com", "daytona.io", "fly.io") and input_dom != final_dom:
            return None  # handled by redirect_duplicate
    return None


def remove_platform_wrappers(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    slug_set = frozenset((r.get("slug") or "").lower() for r in rows)
    kept: list[dict] = []
    removed: list[dict] = []
    for entry in rows:
        reason = is_platform_wrapper(entry, slug_set)
        if reason:
            removed.append({**entry, "removed_reason": reason})
        else:
            kept.append(entry)
    return kept, removed


def remove_inactive(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    kept: list[dict] = []
    removed: list[dict] = []
    for entry in rows:
        reason = inactive_reason(entry)
        if reason:
            removed.append({**entry, "removed_reason": reason})
        else:
            kept.append(entry)
    return kept, removed


def remove_redirect_duplicates(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Drop redirects whose final domain is already a primary provider URL."""
    primary_domains: set[str] = set()
    for entry in rows:
        if entry.get("website_status") == "redirect":
            continue
        dom = norm_domain(entry.get("website", ""))
        if dom:
            primary_domains.add(dom)
        ed = effective_domain(entry)
        if ed:
            primary_domains.add(ed)

    kept: list[dict] = []
    removed: list[dict] = []
    for entry in rows:
        if entry.get("website_status") != "redirect":
            kept.append(entry)
            continue
        final_dom = effective_domain(entry)
        input_dom = norm_domain(entry.get("website", ""))
        if final_dom and final_dom in primary_domains and input_dom != final_dom:
            removed.append(
                {
                    **entry,
                    "removed_reason": f"redirect_duplicate:{final_dom}",
                }
            )
            continue
        # GitHub doc redirect when we only want vendor homepages for wrappers
        if final_dom == "github.com" and not entry.get("profile"):
            removed.append({**entry, "removed_reason": "redirect_github_docs"})
            continue
        kept.append(entry)
    return kept, removed


def dedupe_by_effective_domain(rows: list[dict], entry_rank) -> tuple[list[dict], list[dict]]:
    """One row per effective registrable domain after redirects."""
    by_domain: dict[str, list[dict]] = {}
    for entry in rows:
        dom = effective_domain(entry) or norm_domain(entry.get("website", ""))
        if not dom:
            by_domain.setdefault("", []).append(entry)
            continue
        by_domain.setdefault(dom, []).append(entry)
    kept: list[dict] = []
    dropped: list[dict] = []
    for dom, group in by_domain.items():
        if not dom:
            kept.extend(group)
            continue
        group.sort(key=entry_rank, reverse=True)
        kept.append(group[0])
        for extra in group[1:]:
            dropped.append({**extra, "removed_reason": f"duplicate_effective_domain:{dom}"})
    return kept, dropped