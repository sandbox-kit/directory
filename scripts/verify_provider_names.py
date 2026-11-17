"""Audit provider slug/name/display_name against website; apply curated fixes with --fix."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from provider_enrich import enrich_entry

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"
REPORT = ROOT / "scripts" / ".provider-name-audit.json"

SLUG_RENAMES: dict[str, str] = {
    "kubernetes": "bitkaio",
    "val-town-winding-down": "val-town",
    "sandbox": "codecapsules-sandbox",
    "deno-sandbox-closed-to-new-customers": "deno-sandbox",
}

FIELD_FIXES: dict[str, dict[str, str]] = {
    "bitkaio": {
        "name": "BitKaio",
        "display_name": "BitKaio",
        "website": "https://bitkaio.com",
        "category_guess": "Compute platforms with sandboxes",
    },
    "runloop": {
        "name": "Runloop",
        "display_name": "Runloop",
        "website": "https://runloop.ai",
    },
    "val-town": {
        "name": "Val Town",
        "display_name": "Val Town",
    },
    "codecapsules-sandbox": {
        "name": "Code Capsules",
        "display_name": "Code Capsules",
        "website": "https://codecapsules.io/sandbox",
    },
    "deno-sandbox": {
        "name": "Deno Deploy Sandbox",
        "display_name": "Deno Deploy Sandbox",
        "website": "https://deno.com/deploy/sandbox",
    },
    "wbx": {"name": "WBX Sandbox", "display_name": "WBX Sandbox"},
    "sandboxmcp": {"name": "SandboxMCP", "display_name": "SandboxMCP"},
    "agent-sandbox": {"name": "Agent Sandbox", "display_name": "Agent Sandbox"},
    "gondolin": {"name": "Gondolin", "display_name": "Gondolin"},
    "nehemiah": {"name": "Nehemiah", "display_name": "Nehemiah"},
}

BAD_NAME_RE = re.compile(
    r"\b(winding down|closed to new customers)\b",
    re.I,
)

LANGCHAIN_TITLE_TRAP_RE = re.compile(
    r"^(Kubernetes|OpenShell|Runtime|Docker|Python)$"
)

NEW_PROVIDERS: list[dict] = [
    {
        "slug": "kubernetes-agent-sandbox",
        "name": "Kubernetes Agent Sandbox",
        "website": "https://agent-sandbox.sigs.k8s.io/",
        "profile": "https://agentsandboxes.org/sandboxes/gke-agent-sandbox/",
        "category_guess": "Compute platforms with sandboxes",
        "sources": [
            "https://github.com/kubernetes-sigs/agent-sandbox",
            "https://agent-sandbox.sigs.k8s.io",
            "https://docs.cloud.google.com/kubernetes-engine/docs/concepts/machine-learning/agent-sandbox",
            "agentsandboxes.org",
            "manual:name-audit",
        ],
        "extra": True,
        "display_name": "Kubernetes Agent Sandbox",
        "discovery": ["agentsandboxes.org", "Manual curation"],
        "isolation": ["Sandbox runtime"],
        "funding": [],
    }
]


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def registrable_domain(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    parts = host.split(".")
    if len(parts) >= 2:
        return parts[-2]
    return host


def audit(rows: list[dict]) -> list[dict]:
    issues: list[dict] = []
    slugs = {r["slug"] for r in rows}
    for r in rows:
        slug = r["slug"]
        name = r.get("name") or ""
        display = r.get("display_name") or name
        website = r.get("website") or ""
        brand = registrable_domain(website)

        if BAD_NAME_RE.search(name) or BAD_NAME_RE.search(display):
            issues.append(
                {
                    "kind": "bad_title_pattern",
                    "slug": slug,
                    "name": name,
                    "display_name": display,
                    "website": website,
                }
            )

        if slug in SLUG_RENAMES or slug in FIELD_FIXES:
            continue

        if slug == "sandbox" and brand == "codecapsules":
            issues.append(
                {
                    "kind": "generic_slug_mismatch",
                    "slug": slug,
                    "name": name,
                    "website": website,
                }
            )

        if (
            "langchain-docs" in (r.get("sources") or [])
            and LANGCHAIN_TITLE_TRAP_RE.match(name)
            and name.lower() != slug.replace("-", " ").lower()
        ):
            if norm(brand) not in norm(name) and norm(brand) not in norm(slug):
                issues.append(
                    {
                        "kind": "langchain_integration_trap",
                        "slug": slug,
                        "name": name,
                        "website": website,
                        "domain_brand": brand,
                    }
                )

        if name == "Kubernetes" and brand == "bitkaio":
            issues.append(
                {
                    "kind": "kubernetes_bitkaio",
                    "slug": slug,
                    "name": name,
                    "website": website,
                }
            )

    if "kubernetes-agent-sandbox" not in slugs:
        issues.append(
            {
                "kind": "missing_provider",
                "slug": "kubernetes-agent-sandbox",
                "note": "SIG agent-sandbox not in inventory",
            }
        )

    return issues


def apply_fixes(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        slug = row["slug"]
        new_slug = SLUG_RENAMES.get(slug, slug)
        row = dict(row)
        row["slug"] = new_slug
        if new_slug in FIELD_FIXES:
            row.update(FIELD_FIXES[new_slug])
        elif slug in FIELD_FIXES:
            row.update(FIELD_FIXES[slug])
        enrich_entry(row)
        out.append(row)

    deduped: dict[str, dict] = {}
    for row in out:
        deduped[row["slug"]] = row
    out = list(deduped.values())

    if "kubernetes-agent-sandbox" not in deduped:
        new_row = dict(NEW_PROVIDERS[0])
        enrich_entry(new_row)
        out.append(new_row)

    by_slug = {r["slug"]: r for r in out}
    order = [SLUG_RENAMES.get(s, s) for s in (r["slug"] for r in rows)]
    seen: set[str] = set()
    ordered: list[dict] = []
    for slug in order:
        if slug in by_slug and slug not in seen:
            ordered.append(by_slug[slug])
            seen.add(slug)
    for slug, row in by_slug.items():
        if slug not in seen:
            ordered.append(row)
    return ordered


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix", action="store_true", help="Write fixes to inventory JSON")
    args = parser.parse_args()

    rows = json.loads(OUT.read_text())
    issues = audit(rows)
    REPORT.write_text(json.dumps({"issues": issues}, indent=2) + "\n")

    print(f"Name audit: {len(issues)} issue(s)")
    for item in issues:
        print(f"  [{item.get('kind')}] {item}")

    if args.fix:
        fixed = apply_fixes(rows)
        OUT.write_text(json.dumps(fixed, indent=2) + "\n")
        print(f"Wrote {len(fixed)} providers to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()