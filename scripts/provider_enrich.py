"""Display names, discovery labels, isolation, and funding metadata."""

from __future__ import annotations

import json
import re
from pathlib import Path

from provider_taxonomy import CAT_BY_SLUG, isolation_for_category

ROOT = Path(__file__).resolve().parents[1]
SCRAPE_CACHE = ROOT / "scripts" / ".agentsandboxes-scrape.json"
HN_PREFIX_RE = re.compile(r"^show\s*hn:\s*", re.I)
NPM_NAME_RE = re.compile(r"^@[^/]+/(.+)$")

DISPLAY_OVERRIDES: dict[str, str] = {
    "bitkaio": "BitKaio",
    "kubernetes-agent-sandbox": "Kubernetes Agent Sandbox",
    "chainguard-workspaces": "Chainguard Workspaces",
    "aws-lambda-microvms": "AWS Lambda MicroVMs",
    "aws-nitro-sandboxes": "AWS Nitro Sandboxes",
    "val-town": "Val Town",
    "codecapsules-sandbox": "Code Capsules",
    "deno-sandbox": "Deno Deploy Sandbox",
    "sandboxmcp": "SandboxMCP",
    "wbx": "WBX Sandbox",
    "agent-sandbox": "Agent Sandbox",
    "runtime": "Runtime",
    "show-hn-run-ai-coding-agents-in-real-local-sandboxes-not-git-worktrees": "SuperHQ",
    "show-hn-ai-sandbox-based-on-fep-now-online": "AIC AI Lab",
    "e2b": "E2B",
    "modal-sandboxes": "Modal",
    "fly-io-sprites": "Fly Sprites",
    "cloudflare-sandbox-sdk": "Cloudflare Sandbox",
    "github-codespaces": "GitHub Codespaces",
    "aws-agentcore": "AWS AgentCore",
    "tenki-sandbox": "Luxor Sandbox",
    "show-hn-paperpod": "PaperPod",
    "show-hn-sanbox-batteries-included-sandboxes-for-ai-agents": "Sanbox",
    "show-hn-agent-sandboxes-with-gpus-from-0-20-hr": "Tama",
    "show-hn-portal-spc-f25": "Portal",
    "show-hn-rtrvr-ai": "Rtrvr",
    "show-hn-openlegion": "OpenLegion",
    "show-hn-supapool": "Supapool",
    "show-hn-silos": "Silos",
    "show-hn-serverless-code-execution-but-for-ai-agents": "Sandboxed AI",
    "show-hn-sandbox-ai-agents-with-full-macos": "GhostVM",
    "agent-browser-sandbox": "Agent Browser",
    "agentsh-secure-sandbox": "AgentSH",
    "agentskit-sandbox": "AgentsKit",
}

FUNDING_BY_SLUG: dict[str, list[str]] = {
    "e2b": ["Insight Partners", "Y Combinator (S23)"],
    "daytona": ["Y Combinator", "Decibel", "500 Global"],
    "modal-sandboxes": ["Tiger Global", "Redpoint", "Amplify", "Lux Capital"],
    "browserbase": ["Y Combinator", "Basecase Capital"],
    "hopx": ["Y Combinator (W24)"],
    "leap0": ["Y Combinator"],
    "limrun": ["Y Combinator (Spring 2026)"],
    "tensorlake": ["Y Combinator"],
    "blaxel": ["8VC", "General Catalyst"],
    "northflank": ["Y Combinator"],
    "runloop": ["Y Combinator"],
    "codesandbox": ["Kleiner Perkins"],
    "scrapybara": ["Y Combinator"],
    "steel": ["Abstract Ventures"],
    "kernel": ["Unusual Ventures"],
}

NON_VENDOR_DOMAINS = frozenset(
    {
        "twitter.com",
        "x.com",
        "linkedin.com",
        "medium.com",
        "substack.com",
        "sourcetable.com",
        "vercel.app",
    }
)

GENERIC_SLUGS = frozenset(
    {
        "sandbox",
        "runtime",
        "kubernetes",
        "python-sandbox",
        "windows-sandbox",
    }
)

STATUS_NOISE_RE = re.compile(
    r"\s+(winding down|closed to new customers)\s*",
    re.I,
)

HN_JUNK_PHRASES = (
    "map any folder",
    "github actions locally",
    "live ai music",
    "what sandboxing an ai coding agent in a vm costs",
    "the best way to use mcps",
)

PROFILE_NAMES: dict[str, str] = {}


def _load_profile_names() -> None:
    global PROFILE_NAMES
    if PROFILE_NAMES:
        return
    if not SCRAPE_CACHE.exists():
        return
    try:
        for row in json.loads(SCRAPE_CACHE.read_text()):
            slug = (row.get("slug") or "").lower()
            name = (row.get("name") or "").strip()
            if slug and name and not name.startswith("show-hn"):
                clean = STATUS_NOISE_RE.sub("", name).strip()
                if clean:
                    PROFILE_NAMES[slug] = clean
    except Exception:
        pass


def norm_domain(url: str) -> str:
    if not url:
        return ""
    u = url.lower().rstrip("/")
    u = u.split("://", 1)[-1]
    return u.split("/")[0].removeprefix("www.")


def brand_from_domain(url: str) -> str:
    dom = norm_domain(url)
    if not dom:
        return ""
    core = dom.split(".")[0]
    specials = {
        "e2b": "E2B",
        "modal": "Modal",
        "daytona": "Daytona",
        "fly": "Fly",
        "aws": "AWS",
        "gcp": "Google Cloud",
        "github": "GitHub",
    }
    if core in specials:
        return specials[core]
    if core.endswith("vm") and len(core) > 3:
        return core[:-2].replace("-", " ").title() + "VM"
    return core.replace("-", " ").title()


def brand_from_show_hn_slug(slug: str) -> str:
    if not slug.startswith("show-hn-"):
        return ""
    tail = slug[len("show-hn-") :]
    parts = [p for p in tail.split("-") if p and p not in ("an", "the", "with", "for", "from")]
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0].title()
    return parts[0].title()


def clean_hn_title(name: str) -> str:
    title = HN_PREFIX_RE.sub("", name).strip()
    if "," in title:
        title = title.split(",", 1)[0].strip()
    if "–" in title:
        title = title.split("–", 1)[0].strip()
    if len(title) > 48:
        return ""
    if any(title.lower().startswith(p) for p in ("i built", "the best", "run your", "what ", "new ", "map any")):
        return ""
    return title


def display_name_for(entry: dict) -> str:
    _load_profile_names()
    slug = (entry.get("slug") or "").lower()
    if slug in DISPLAY_OVERRIDES:
        return DISPLAY_OVERRIDES[slug]
    if slug in PROFILE_NAMES and not PROFILE_NAMES[slug].startswith("@"):
        return PROFILE_NAMES[slug]
    raw = (entry.get("name") or "").strip()
    website = entry.get("website") or ""
    if raw.startswith("@"):
        return brand_from_domain(website) or raw.split("/")[-1].replace("-", " ").title()
    if HN_PREFIX_RE.match(raw):
        short = clean_hn_title(raw)
        if short:
            return short
        return brand_from_show_hn_slug(slug) or brand_from_domain(website)
    brand = brand_from_domain(website)
    if slug in GENERIC_SLUGS and brand and norm_domain(website):
        core = norm_domain(website).split(".")[0]
        if core and core not in slug:
            return brand

    if STATUS_NOISE_RE.search(raw):
        cleaned = STATUS_NOISE_RE.sub("", raw).strip()
        if cleaned:
            return cleaned

    if raw and raw != "Discovered" and len(raw) <= 48 and not raw.lower().startswith("show hn"):
        if len(raw) >= 28 and brand and norm_domain(website):
            core = norm_domain(website).split(".")[0]
            if core and core not in raw.lower().replace(" ", ""):
                return brand
        return raw
    return brand or slug.replace("-", " ").title()


def discovery_labels(sources: list[str] | None) -> list[str]:
    labels: list[str] = []
    seen: set[str] = set()
    for src in sources or []:
        low = src.lower()
        label: str | None = None
        if low.startswith("hn:") or low == "hn":
            label = "Hacker News"
        elif low.startswith("yc:"):
            batch = src.split(":", 1)[1].strip()
            label = f"Y Combinator ({batch})" if batch else "Y Combinator"
        elif low == "yc":
            label = "Y Combinator"
        elif low.startswith("npm:"):
            label = "npm"
        elif low.startswith("pypi:") or low.startswith("crates.io:"):
            label = "Package registry"
        elif low.startswith("github:") or low.startswith("github-topic:"):
            label = "GitHub"
        elif "agentsandboxes.org" in low or low == "agentsandboxes.fyi":
            label = "agentsandboxes.org"
        elif low == "boxyard":
            label = "boxyard.dev"
        elif low == "infraforagents" or "infraforagents" in low:
            label = "InfraForAgents"
        elif low == "sandboxindex.dev":
            label = "sandboxindex.dev"
        elif low == "producthunt":
            label = "Product Hunt"
        elif low.startswith("langchain"):
            label = "LangChain"
        elif "roost" in low:
            label = "roost.guide"
        elif "awesome" in low:
            label = "Awesome list"
        elif low.startswith("manual"):
            label = "Manual curation"
        elif low.startswith("http") and len(labels) < 2:
            label = "Curated index"
        if label and label not in seen:
            seen.add(label)
            labels.append(label)
    return labels


def infer_isolation(entry: dict, category: str) -> list[str]:
    tags = list(isolation_for_category(category))
    blob = " ".join(
        [
            entry.get("name") or "",
            entry.get("slug") or "",
            entry.get("website") or "",
            category,
            " ".join(entry.get("sources") or []),
        ]
    ).lower()
    rules = [
        ("firecracker", "Firecracker microVM"),
        ("microvm", "Firecracker microVM"),
        ("gvisor", "gVisor"),
        ("gvisor", "gVisor"),
        ("webcontainer", "WebContainers"),
        ("wasm", "WebAssembly"),
        ("browser", "Remote browser"),
        ("playwright", "Remote browser"),
        ("docker", "Docker containers"),
        ("nitro", "AWS Nitro"),
        ("kata", "Kata Containers"),
    ]
    seen = {t.lower() for t in tags}
    for needle, label in rules:
        if needle in blob and label.lower() not in seen:
            tags.append(label)
            seen.add(label.lower())
    if not tags:
        tags.append("Sandbox runtime")
    out: list[str] = []
    seen_t: set[str] = set()
    for t in tags:
        key = t.lower()
        if key not in seen_t:
            seen_t.add(key)
            out.append(t)
    return out[:4]


def infer_funding(entry: dict) -> list[str]:
    slug = (entry.get("slug") or "").lower()
    if slug in FUNDING_BY_SLUG:
        val = FUNDING_BY_SLUG[slug]
        return val if isinstance(val, list) else [val]
    funding: list[str] = []
    for src in entry.get("sources") or []:
        if src.startswith("yc:"):
            batch = src.split(":", 1)[1].strip()
            if batch:
                funding.append(f"Y Combinator ({batch})")
            elif "Y Combinator" not in funding:
                funding.append("Y Combinator")
        elif src == "yc" and "Y Combinator" not in funding:
            funding.append("Y Combinator")
        elif src == "producthunt" and "Product Hunt" not in funding:
            funding.append("Product Hunt launch")
    return funding[:4]


_NON_PROVIDER_URL_RE = re.compile(
    r"pypi\.org/project/|crates\.io/crates/|/posts/|comparesandboxes\.com|creativecommons\.org",
    re.I,
)


def drop_non_vendor(entry: dict) -> str | None:
    url = entry.get("website") or ""
    dom = norm_domain(url)
    if dom in NON_VENDOR_DOMAINS:
        return f"non_vendor_domain:{dom}"
    if _NON_PROVIDER_URL_RE.search(url):
        return "non_provider_url"
    slug = (entry.get("slug") or "").lower()
    if slug.startswith("show-hn"):
        blob = (entry.get("name") or "").lower()
        if any(p in blob for p in HN_JUNK_PHRASES):
            return "hn_not_sandbox_product"
    return None


def enrich_entry(entry: dict) -> None:
    slug = (entry.get("slug") or "").lower()
    category = CAT_BY_SLUG.get(slug) or entry.get("category_guess") or "Other / verify category"
    if category in ("Discovered", ""):
        category = CAT_BY_SLUG.get(slug) or "Other / verify category"
    entry["category_guess"] = category
    entry["display_name"] = display_name_for(entry)
    if entry["display_name"]:
        entry["name"] = entry["display_name"]
    entry["discovery"] = discovery_labels(entry.get("sources"))
    entry["isolation"] = infer_isolation(entry, category)
    entry["funding"] = infer_funding(entry)


def enrich_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    kept: list[dict] = []
    removed: list[dict] = []
    for entry in rows:
        reason = drop_non_vendor(entry)
        if reason:
            removed.append({**entry, "removed_reason": reason})
            continue
        enrich_entry(entry)
        kept.append(entry)
    return kept, removed