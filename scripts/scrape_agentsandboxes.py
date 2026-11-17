#!/usr/bin/env python3
"""Scrape https://agentsandboxes.org/sandboxes/* profile pages for primary website links."""

import concurrent.futures
import json
import re
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITEMAP_CACHED = (
    Path.home()
    / ".cursor/projects/Users-nabhag-OpenSource-sandbox-pricing/agent-tools/e6a7db5b-d6be-4834-a8b5-d6241f201121.txt"
)


def load_profile_urls() -> list[str]:
    if SITEMAP_CACHED.exists():
        text = SITEMAP_CACHED.read_text()
    else:
        req = urllib.request.Request(
            "https://agentsandboxes.org/sitemap.xml",
            headers={"User-Agent": "sandbox-pricing-crawler/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode("utf-8", errors="replace")
    return re.findall(r"<loc>(https://agentsandboxes\.org/sandboxes/[^<]+)</loc>", text)


def fetch(u: str) -> dict:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        return {"profile": u, "error": str(e)}
    slug = u.rstrip("/").split("/")[-1]
    title_m = re.search(r"<title>([^<|]+)", html)
    name = title_m.group(1).strip() if title_m else slug
    name = re.sub(r":.*$", "", name).strip()
    sources: list[str] = []
    block_m = re.search(r'<section[^>]*id="sources"[^>]*>(.*?)</section>', html, re.S | re.I)
    if block_m:
        block = block_m.group(1)
        for m in re.finditer(r'<a[^>]+href="([^"]+)"', block):
            sources.append(unescape(m.group(1)))
        for m in re.finditer(r"<li[^>]*>\s*([^<]+)", block):
            t = m.group(1).strip()
            if t and not t.startswith("http"):
                t = "https://" + t
            if t.startswith("http"):
                sources.append(t)
    website = None
    for s in sources:
        if "agentsandboxes.org" not in s:
            website = s
            break
    return {
        "slug": slug,
        "name": name,
        "profile": u,
        "website": website,
        "sources": sources[:8],
    }


def main() -> None:
    urls = load_profile_urls()
    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for r in ex.map(fetch, urls):
            results.append(r)
    out = ROOT / "scripts" / ".agentsandboxes-scrape.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2))
    with_site = sum(1 for r in results if r.get("website"))
    print(f"scraped {len(results)} profiles; {with_site} with website -> {out}")


if __name__ == "__main__":
    main()