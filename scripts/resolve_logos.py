#!/usr/bin/env python3
"""Resolve provider logos into public/agent-sandbox-providers.json (run after discover/validate)."""

from __future__ import annotations

import concurrent.futures
import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from logo_resolve import resolve_logo_url

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"
WORKERS = 16


def resolve_one(entry: dict) -> tuple[str, str | None]:
    slug = entry.get("slug") or ""
    website = (entry.get("website") or "").strip()
    if not website:
        return slug, None
    return slug, resolve_logo_url(website)


def main() -> None:
    rows: list[dict] = json.loads(OUT.read_text())
    resolved = 0
    cleared = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = dict(pool.map(resolve_one, rows))

    for entry in rows:
        slug = entry.get("slug") or ""
        url = results.get(slug)
        if url:
            entry["logo_url"] = url
            resolved += 1
        else:
            entry.pop("logo_url", None)
            cleared += 1

    OUT.write_text(json.dumps(rows, indent=2) + "\n")
    print(f"resolved={resolved} no_logo={cleared} total={len(rows)} -> {OUT}")


if __name__ == "__main__":
    main()