#!/usr/bin/env python3
"""
Exhaustively discover AI agent sandbox providers from public indexes, awesome lists,
roost.guide, YC directory (Algolia), HN Show HN, agentsandboxes.fyi, boxyard, LangChain
sandbox docs, Product Hunt launches, PyPI, crates.io, GitHub topics, npm, and GitHub.
Merges into public/agent-sandbox-providers.json.
"""

from __future__ import annotations

import concurrent.futures
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"
SCRAPE_CACHE = ROOT / "scripts" / ".agentsandboxes-scrape.json"

# --- Agent-sandbox only: exclude routers, pure CI, policy-only tools, bare isolation distros ---
EXCLUDE_URL_SUBSTR = (
    "computesdk.com",
    "vibekit.sh",
    "theagentstack.dev",
    "prized.dev/blog",
    "github.com/actions",
    "github.com/firecracker-microvm/firecracker",
    "github.com/google/gvisor",
    "github.com/bytecodealliance/wasmtime",
    "github.com/containers/bubblewrap",
    "github.com/kata-containers/kata-containers",
    "github.com/agentfence",
    "hol.org/guard",
    "github.com/hostinger/fireactions",
    "agentsandbox.net",  # in-browser Pyodide demo, not a provider platform
    "awesome.re/badge",
    "towardsdev.com",
    "youtube.com/watch",
    "circleci.com/blog",
    "designarena.ai",
    "obsidian.md",
    "pleasedonotescape.com",  # jail list index, not a provider
    "agents.one/playground",
    "europealternatives.com",
    "claydon.co/posts",
    "comparesandboxes.com",
    "pypi.org/project/",
    "crates.io/crates/",
    "creativecommons.org",
    "agentsandboxes.fyi",
    "boxyard.dev",
    "sandboxindex.dev",
    "roost.guide",
    "infraforagents.com",
    "agentsandboxes.org",
)

EXCLUDE_NAME_RE = re.compile(
    r"^(Firecracker|gVisor|Wasmtime|Wasmer|Kata Containers|Bubblewrap|libkrun|Pyodide|"
    r"ComputeSDK|VibeKit|AgentFence|HOL Guard|Fireactions|dtshim)$",
    re.I,
)

ROOST_NAME_TO_URL = {
    "froog": "https://froog.ai",
    "Lizard": "https://lizard.build/sandboxes",
    "InstaBox": "https://instabox.sh",
    "Zode": "https://zode.dev",
    "Munito AI": "https://munito.ai",
    "boat": "https://boat.sh",
    "Maritime": "https://maritime.dev",
    "Koyeb": "https://www.koyeb.com/docs/sandboxes",
    "Celesto": "https://celesto.ai",
    "Mosaic Sandbox": "https://sandbox.mosaicos.com",
    "Quivvo": "https://tryquivvo.com",
    "Northflank": "https://northflank.com/sandboxes",
    "Buddy Sandboxes": "https://buddy.works/sandboxes",
    "exe.dev": "https://exe.dev",
    "Novita AI": "https://novita.ai/sandbox",
    "CreateOS": "https://createos.sh/products/sandbox",
    "Freestyle": "https://freestyle.sh",
    "Beam": "https://www.beam.cloud/sandbox",
    "Together Sandbox": "https://www.together.ai/products/code-sandbox",
    "boxd": "https://boxd.sh",
    "BoxLite Cloud": "https://boxlite.ai",
    "Fly.io Sprites": "https://fly.io/sprites",
    "Blaxel": "https://blaxel.ai",
    "Daytona": "https://www.daytona.io/docs/en/sandboxes/",
    "E2B": "https://e2b.dev",
    "Tenki": "https://tenki.cloud/products/sandbox",
    "Cloudflare Sandbox": "https://developers.cloudflare.com/sandbox/",
    "Tensorlake": "https://tensorlake.ai",
    "Upstash Box": "https://upstash.com/docs/box/overview",
    "Google Cloud Agent Platform sandboxes": "https://cloud.google.com/agent-builder/docs/sandbox",
    "AWS Bedrock AgentCore Code Interpreter": "https://aws.amazon.com/bedrock/agentcore/",
    "Modal": "https://modal.com/docs/guide/sandboxes",
    "Namespace": "https://namespace.so",
    "AWS Lambda MicroVMs": "https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances.html",
    "Islo": "https://islo.dev",
    "Nanite": "https://nanite.run",
    "Vercel Sandbox": "https://vercel.com/docs/sandbox",
    "Depot": "https://depot.dev/products/sandboxes",
    "boxes.dev": "https://boxes.dev",
    "AWS Nitro Sandboxes": "https://docs.aws.amazon.com/eks/latest/userguide/nitro-enclaves.html",
    "Agent 37": "https://www.agent37.dev",
    "BoxCompute": "https://boxcompute.ai",
    "Deno Sandbox": "https://docs.deno.com/sandboxes/",
    "Morph Cloud": "https://morph.so",
    "Nodus Compute": "https://nodus-compute.ai",
    "Quave ONE Agent Sandboxes": "https://quave.one",
    "Render Sandboxes": "https://render.com/docs/sandboxes",
    "Ostra": "https://ostra.run",
    "Corevelos": "https://corevelos.com",
    "AgentSphere": "https://www.agentsphere.run",
    "Cognitora": "https://www.cognitora.dev",
    "BlueRock Agent Sandbox": "https://www.bluerock.io/products/agent-sandbox",
    "kosa8": "https://kosa8.com",
    "ainclave": "https://ainclave.com",
    "Workpaper": "https://workpaper.co",
    "Box (ascii.dev)": "https://box.ascii.dev",
    "OnlineCompiler.io": "https://onlinecompiler.io",
    "Cloudish": "https://cloudish.ai",
    "Clusy": "https://www.clusy.io",
    "Kalahari": "https://amlalabs.com/kalahari",
    "arcbox": "https://arcbox.dev",
    "shuru": "http://shuru.run",
    "ailoy": "https://ailoy.co",
    "pocketenv": "https://pocketenv.io",
    "terrarium": "https://terrarium.sh",
    "brig": "https://brig.sh",
    "nehemiah": "https://boringcomputers.com",
    "gondolin": "https://earendil-works.github.io/gondolin",
    "cocoonstack": "https://cocoonstack.github.io/sandbox/",
    "pandastack": "https://www.pandastack.ai",
    "Cleanroom": "https://github.com/buildkite/cleanroom",
    "Mitos": "https://github.com/mitos-run/mitos",
    "AgentENV": "https://kvcache-ai.github.io/AgentENV/",
    "Katakate (k7)": "https://github.com/Katakate/k7",
    "SandBase Harness": "https://github.com/sandbaseai/sandbase-harness",
    "BunkerVM": "https://github.com/ashishgituser/bunkervm",
    "Sandboxer": "https://github.com/ammmir/sandboxer",
    "SandboxAI": "https://github.com/substratusai/sandboxai",
    "AEGIS orchestrator": "https://github.com/100monkeys-ai/aegis-orchestrator",
    "Mudroom": "https://github.com/Kernel-Hunter/mudroom",
    "clampdown": "https://github.com/luca89/clampdown",
    "clawker": "https://github.com/schmitthub/clawker",
    "AirlockAI": "https://github.com/larytet-py/AirlockAI",
    "HiveBox": "https://github.com/TetiAI/hivebox",
    "Greywall": "https://github.com/GreyhavenHQ/greywall",
    "LocalSandbox": "https://github.com/coplane/localsandbox",
    "AgentFS": "https://docs.turso.tech/agentfs",
    "amla-sandbox": "https://github.com/amlalabs/amla-sandbox",
    "Aegis": "https://github.com/jeshwanthsingh/Aegis",
    "vivek1504/agent-sandbox": "https://github.com/vivek1504/agent-sandbox",
}

MANUAL_SEED = [
    ("Ostra", "https://ostra.run", "roost"),
    ("Corevelos", "https://corevelos.com", "web"),
    ("Kalahari", "https://www.npmjs.com/package/@amlalabs/kalahari", "npm"),
    ("Karinja", "https://karinja.ai", "blog"),
    ("Hugging Face Sandboxes", "https://huggingface.co/docs/hub/en/agents-sandboxes", "docs"),
    ("Alibaba AgentRun", "https://www.alibabacloud.com/help/en/agentrun/", "cloud"),
    ("Volcengine veFaaS", "https://www.volcengine.com", "cloud"),
    ("ScitiX", "https://scitix.com", "k8s"),
    ("Render Sandboxes", "https://render.com/docs/sandboxes", "roost"),
    ("Quave ONE", "https://quave.one", "roost"),
    ("StateSet", "https://stateset.com", "hosted"),
    ("Brimble", "https://brimble.io", "hosted"),
    ("Paperpod", "https://www.paperpod.dev", "hosted"),
    ("SeaCloud", "https://seacloud.io", "hosted"),
    ("ShardFlux", "https://shardflux.dev", "hosted"),
    ("Machine0", "https://machine0.io", "hosted"),
    ("Collimate", "https://collimate.com", "hosted"),
    ("Coasty Machines", "https://coasty.ai/platform/", "hosted"),
    ("Dedalus Machines", "https://dedaluslabs.ai", "hosted"),
    ("Dexto", "https://dexto.ai", "hosted"),
    ("Amika Rigs", "https://www.amika.dev", "hosted"),
    ("Arker", "https://arker.ai", "hosted"),
    ("AgentComputer", "https://agentcomputer.com", "hosted"),
    ("Isorun", "https://isorun.com", "hosted"),
    ("Kedge Workspaces", "https://kedge.dev", "hosted"),
    ("Tama", "https://tama.computer", "hosted"),
    ("OpenPond", "https://openpond.ai", "hosted"),
    ("Orkestr", "https://orkestr.io", "hosted"),
    ("UCloud Sandbox", "https://www.ucloud.cn", "hosted"),
    ("Nebius Token Factory", "https://nebius.com", "hosted"),
    ("Huawei AgentArts", "https://www.huaweicloud.com", "hosted"),
    ("Tencent Agent Sandbox", "https://cloud.tencent.com", "hosted"),
    ("TinySandbox", "https://www.npmjs.com/package/@tinysandbox/tinysandbox", "npm"),
    ("Eum Agent Sandbox", "https://www.npmjs.com/package/@eum-agent/sandbox", "npm"),
    ("Sandock", "https://www.npmjs.com/package/@bunny-agent/sandbox-sandock", "npm"),
    ("Hyperbrowser Sandboxes", "https://www.hyperbrowser.ai", "hosted"),
    ("Simular Box", "https://box.simular.ai", "hosted"),
    ("Capy", "https://capy.ai", "hosted"),
    ("LangSmith Sandboxes", "https://www.langchain.com/langsmith/sandboxes", "hosted"),
    ("Miosa", "https://miosa.ai", "hosted"),
    ("Mosaic", "https://mosaic.so", "hosted"),
    ("OmniRun", "https://omnirun.io", "hosted"),
    ("PPIO", "https://ppio.com", "hosted"),
    ("Sandbox0", "https://sandbox0.ai", "hosted"),
    ("Solari", "https://www.getsolari.com/sandboxes", "hosted"),
    ("Nodus Compute", "https://www.nodus-compute.ai", "hosted"),
    ("Shellbox", "https://shellbox.dev", "hosted"),
    ("Tangle", "https://tangle.so", "hosted"),
    ("Brood Box", "https://github.com/stacklok/brood-box", "github"),
    ("KumaBox", "https://github.com/kgpp34/KumaBox", "github"),
    ("krunai", "https://github.com/slp/krunai", "github"),
    ("nvx", "https://github.com/microsoft/nvx", "github"),
    ("clawk", "https://github.com/clawkwork/clawk", "github"),
    ("pocketenv", "https://pocketenv.io", "github"),
    ("softlock", "https://github.com/korableg/softlock", "github"),
    ("Prized Sandboxes", "https://prized.dev", "web"),
    ("FissionPlane", "https://fissionplane.dev", "web"),
    ("Replicas", "https://replicas.dev", "yc"),
    ("Castari", "https://castari.com", "yc"),
    ("Archal", "https://www.archal.ai", "yc"),
    ("Playgent", "https://useplaygent.com", "yc"),
    ("Butter", "https://butter.dev", "yc"),
    ("OpenScale", "https://openscale.so", "yc"),
    ("Limrun", "https://lim.run", "yc"),
    ("Thunder Compute", "https://www.thundercompute.com", "yc"),
    ("StackMachine", "https://stackmachine.com", "yc"),
    ("ForeverVM", "https://forevervm.com", "agentsandboxes.fyi"),
    ("Microsandbox", "https://microsandbox.dev", "agentsandboxes.fyi"),
    ("Leap0", "https://leap0.dev", "InfraForAgents"),
    ("Isle", "https://www.tryisle.com", "InfraForAgents"),
    ("Orgo", "https://www.orgo.ai", "InfraForAgents"),
    ("OpenComputer", "https://opencomputer.dev", "InfraForAgents"),
    ("Sandbox as a Service", "https://sandbox-as-a-service.com", "InfraForAgents"),
    ("smol machines", "https://smolmachines.com", "InfraForAgents"),
    ("Railway Sandboxes", "https://railway.com/sandboxes", "InfraForAgents"),
    ("Prime Intellect Sandboxes", "https://www.primeintellect.ai/sandboxes", "InfraForAgents"),
    ("Rivet agentOS", "https://rivet.dev/agentos", "InfraForAgents"),
    ("Tencent CubeSandbox", "https://cubesandbox.com", "InfraForAgents"),
    ("OpenSandbox", "https://open-sandbox.ai", "InfraForAgents"),
    ("Opsen", "https://opsen.dev", "langchain-docs"),
    ("Briq", "https://briq.cloud", "langchain-docs"),
    ("WBX Sandbox", "https://sandbox.wbx.cz", "langchain-docs"),
    ("NoMac", "https://nomac.app", "langchain-docs"),
    ("Agent Sandbox (agentsandbox.co)", "https://agentsandbox.co", "producthunt"),
    ("Strukto Mirage", "https://www.strukto.ai", "web"),
    ("AgentConnect", "https://www.agentconnect.md", "web"),
    ("Nuwax", "https://nuwax.com", "web"),
    ("OpenMA", "https://openma.ai", "web"),
    ("Containarium", "https://containarium.dev", "web"),
    ("DeltaBox", "https://delta-box.github.io", "web"),
    ("Minimal", "https://minimal.dev", "web"),
    ("RunPod", "https://www.runpod.io", "hosted"),
]

LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")


def norm_domain(url: str) -> str:
    if not url:
        return ""
    u = url.lower().rstrip("/")
    if u.startswith("git+"):
        u = u[4:]
    u = u.split("://", 1)[-1]
    u = u.split("/")[0]
    if u.startswith("www."):
        u = u[4:]
    return u


def excluded(url: str, name: str) -> bool:
    if EXCLUDE_NAME_RE.match(name.strip()):
        return True
    low = (url or "").lower()
    return any(x in low for x in EXCLUDE_URL_SUBSTR)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "sandbox-pricing-discovery/2.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_markdown_links(text: str, source: str) -> list[dict]:
    found = []
    for name, url in LINK_RE.findall(text):
        name = name.strip()
        url = url.strip()
        if excluded(url, name):
            continue
        if "github.com" in url and "/blob/" in url:
            continue
        found.append({"name": name, "website": url, "sources": [source], "extra": True})
    return found


def github_search(query: str, per_page: int = 100) -> list[dict]:
    q = urllib.parse.quote(query)
    url = f"https://api.github.com/search/repositories?q={q}&sort=stars&per_page={per_page}"
    req = urllib.request.Request(url, headers={"User-Agent": "sandbox-pricing-discovery", "Accept": "application/vnd.github+json"})
    try:
        data = json.loads(fetch_url(req))
    except Exception:
        return []
    out = []
    for r in data.get("items", []):
        name = r.get("full_name", "")
        home = r.get("homepage") or ""
        html = r.get("html_url", "")
        desc = (r.get("description") or "").lower()
        if not any(k in (desc + " " + name.lower()) for k in ("sandbox", "agent", "microvm", "code exec", "untrusted")):
            continue
        website = home if home.startswith("http") else html
        out.append(
            {
                "name": r.get("name") or name,
                "website": website,
                "sources": [f"github:{query}"],
                "extra": True,
                "github_stars": r.get("stargazers_count"),
            }
        )
    return out


def fetch_url(req: urllib.request.Request) -> str:
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def npm_search(term: str, size: int = 100) -> list[dict]:
    q = urllib.parse.quote(term)
    url = f"https://registry.npmjs.org/-/v1/search?text={q}&size={size}"
    try:
        data = json.loads(fetch(url))
    except Exception:
        return []
    out = []
    for obj in data.get("objects", []):
        p = obj.get("package", {})
        name = p.get("name", "")
        desc = (p.get("description") or "").lower()
        keywords = " ".join(p.get("keywords") or []).lower()
        blob = f"{name} {desc} {keywords}"
        if "sandbox" not in blob and "code-interpreter" not in blob:
            continue
        if not any(k in blob for k in ("agent", "llm", "e2b", "modal", "daytona", "mcp", "untrusted", "microvm")):
            continue
        links = p.get("links") or {}
        website = links.get("homepage") or links.get("repository") or links.get("npm")
        if not website or excluded(website, name):
            continue
        out.append({"name": name, "website": website, "sources": [f"npm:{term}"], "extra": True})
    return out


def load_existing() -> list[dict]:
    rows: list[dict] = []
    if OUT.exists():
        return json.loads(OUT.read_text())
    for path in (SCRAPE_CACHE,):
        if path.exists():
            rows, _ = merge_entries(rows, json.loads(path.read_text()))
    return rows


def merge_entries(existing: list[dict], new_items: list[dict]) -> tuple[list[dict], int]:
    by_domain: dict[str, dict] = {}
    for e in existing:
        d = norm_domain(e.get("website", ""))
        if d:
            by_domain[d] = e
    added = 0
    for item in new_items:
        url = item.get("website", "")
        name = item.get("name", "Unknown")
        if not url or excluded(url, name):
            continue
        d = norm_domain(url)
        if not d:
            continue
        if d in by_domain:
            # enrich sources only
            prev = by_domain[d]
            for s in item.get("sources", []):
                if s not in prev.setdefault("sources", []):
                    prev["sources"].append(s)
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]
        entry = {
            "slug": slug,
            "name": name,
            "website": url.rstrip("/") if not url.endswith(".md") else url,
            "profile": item.get("profile"),
            "category_guess": item.get("category_guess", "Discovered"),
            "sources": item.get("sources", []),
            "extra": True,
        }
        by_domain[d] = entry
        added += 1
    merged = list(by_domain.values())
    merged.sort(key=lambda x: (x.get("name") or "").lower())
    return merged, added


# Not AI agent sandboxes — bare isolation distros / routers / indexes
EXCLUDE_SLUGS = frozenset(
    {
        "firecracker",
        "gvisor",
        "wasmtime",
        "wasmer",
        "kata-containers",
        "bubblewrap",
        "libkrun",
        "nsjail",
        "firejail",
        "pyodide",
        "extism",
        "fermyon-spin",
        "edera",
        "aws-nitro-sandboxes",
        "just-bash",
        "jilebi",
        "declaw",
    }
)


def parse_roost_table(text: str) -> list[dict]:
    out = []
    for line in text.splitlines():
        if not line.startswith("|") or line.startswith("| ---"):
            continue
        cols = [c.strip() for c in line.split("|")[1:-1]]
        if not cols or cols[0] in ("Provider", "---"):
            continue
        if cols[0].isdigit() or cols[0] == "---":
            continue
        name = cols[0]
        url = ROOST_NAME_TO_URL.get(name)
        if url:
            out.append({"name": name, "website": url, "sources": ["roost.guide"], "extra": True})
    return out


YC_SEARCH_QUERIES = (
    "sandbox",
    "agent sandbox",
    "code execution",
    "coding agent cloud",
    "microvm",
    "firecracker agent",
    "agent harness",
    "code interpreter",
    "persistent computer agent",
    "GPU sandbox",
    "embedded sandbox",
    "virtual machine agent",
    "untrusted code",
)

YC_EXCLUDE_ONELINER = (
    "browser defense",
    "browser automation for businesses",
    "no-code browser",
    "browser copilot",
    "browser rpa",
    "sandbox banking",
    "low-code integration platform for banking",
    "make all team work visible",
    "dream career",
    "healthcare agent",
    "video editor",
    "design system layer",
    "worldbuilding",
    "crypto traders",
    "global bank",
)


def _yc_sandbox_provider_hit(hit: dict) -> bool:
    ol = " ".join(
        (
            hit.get("one_liner") or "",
            (hit.get("long_description") or "")[:400],
            hit.get("name") or "",
        )
    ).lower()
    if any(x in ol for x in YC_EXCLUDE_ONELINER):
        return False
    if "sandbox" not in ol and "microvm" not in ol and "firecracker vm" not in ol:
        if "virtual machine" in ol and "agent" not in ol:
            return False
        if not any(
            k in ol
            for k in (
                "gpu sandbox",
                "embedded sandbox",
                "api sandbox",
                "cheapest sandbox",
                "sandboxes for ai",
                "sandbox for ai",
                "cloud computer an agent",
                "persistent computer",
                "instant sandbox",
                "sandboxed server",
                "sandboxed virtual machine",
                "sandbox vm",
            )
        ):
            return False
    if not any(
        k in ol
        for k in (
            "agent",
            "coding",
            "ai ",
            "llm",
            "inference",
            "harness",
            "devtools",
            "infrastructure",
            "cloud platform",
            "untrusted",
            "isolate",
            "execute code",
            "run code",
        )
    ):
        return False
    return True


def discover_yc_startups() -> list[dict]:
    """YC company directory (public Algolia key on /companies)."""
    try:
        html = fetch("https://www.ycombinator.com/companies?query=sandbox")
    except Exception as e:
        print("yc skip fetch", e)
        return []
    m = re.search(r"window\.AlgoliaOpts\s*=\s*(\{[^<]+\})", html)
    if not m:
        print("yc skip no AlgoliaOpts")
        return []
    opts = json.loads(m.group(1))
    app_id, api_key = opts["app"], opts["key"]
    index = "YCCompany_production"
    algolia_url = f"https://{app_id}-dsn.algolia.net/1/indexes/{index}/query"
    out: list[dict] = []
    seen_domains: set[str] = set()
    for query in YC_SEARCH_QUERIES:
        body = json.dumps({"query": query, "hitsPerPage": 80}).encode()
        req = urllib.request.Request(
            algolia_url,
            data=body,
            headers={
                "X-Algolia-API-Key": api_key,
                "X-Algolia-Application-Id": app_id,
                "Content-Type": "application/json",
                "User-Agent": "sandbox-pricing-discovery/2.0",
            },
        )
        try:
            data = json.loads(fetch_url(req))
        except Exception as e:
            print("yc skip query", query, e)
            continue
        for hit in data.get("hits", []):
            if not _yc_sandbox_provider_hit(hit):
                continue
            name = (hit.get("name") or "").strip()
            website = (hit.get("website") or "").strip()
            if not name or not website:
                continue
            if not website.startswith("http"):
                website = "https://" + website.lstrip("/")
            d = norm_domain(website)
            if d in seen_domains or excluded(website, name):
                continue
            seen_domains.add(d)
            batch = hit.get("batch") or hit.get("batch_name") or ""
            src = f"yc:{batch or query}"
            out.append({"name": name, "website": website, "sources": [src, "yc"], "extra": True})
    return out


FYI_SLUG_TO_URL = {
    "e2b": "https://e2b.dev",
    "daytona": "https://www.daytona.io",
    "modal": "https://modal.com",
    "vercel-sandbox": "https://vercel.com/docs/sandbox",
    "cloudflare-sandbox": "https://developers.cloudflare.com/sandbox/",
    "blaxel": "https://blaxel.ai",
    "freestyle": "https://www.freestyle.sh",
    "fly-sprites": "https://fly.io/sprites",
    "runloop": "https://runloop.ai",
    "hopx": "https://hopx.ai",
    "microsandbox": "https://microsandbox.dev",
    "morph": "https://morphllm.com",
    "codesandbox-sdk": "https://codesandbox.io/docs/sdk",
    "forevervm": "https://forevervm.com",
    "riza": "https://riza.io",
    "judge0": "https://judge0.com",
    "piston": "https://piston.readthedocs.io",
    "opensandbox": "https://github.com/alibaba/OpenSandbox",
    "aws-agentcore": "https://aws.amazon.com/bedrock/agentcore/",
    "browserbase": "https://www.browserbase.com",
    "kernel": "https://onkernel.com",
    "steel": "https://steel.dev",
    "scrapybara": "https://scrapybara.com",
    "cua": "https://cua.ai",
    "northflank": "https://northflank.com",
    "createos-sandbox": "https://createos.sh/products/sandbox",
    "boxd": "https://boxd.sh",
}


def discover_agentsandboxes_fyi() -> list[dict]:
    """agentsandboxes.fyi listing sitemap (27 curated providers)."""
    out: list[dict] = []
    try:
        xml = fetch("https://agentsandboxes.fyi/sitemaps/listings-1.xml")
    except Exception as e:
        print("fyi skip sitemap", e)
        return out
    for loc in re.findall(r"<loc>(https://agentsandboxes\.fyi/[^<]+)</loc>", xml):
        slug = loc.rstrip("/").split("/")[-1]
        url = FYI_SLUG_TO_URL.get(slug)
        if not url:
            try:
                page = fetch(loc)
                m = re.search(r"- Website:\s*([a-zA-Z0-9.-]+\.[a-z]{2,})", page)
                if m:
                    url = "https://" + m.group(1)
                else:
                    m2 = re.search(r"visit (https?://[^\s)]+)", page, re.I)
                    url = m2.group(1) if m2 else ""
            except Exception:
                url = ""
        if not url:
            continue
        name = slug.replace("-", " ").title()
        out.append(
            {
                "name": name,
                "website": url,
                "sources": ["agentsandboxes.fyi"],
                "extra": True,
            }
        )
    return out


HN_SHOW_QUERIES = (
    "agent sandbox",
    "AI sandbox",
    "code execution sandbox",
    "microvm agent",
    "firecracker sandbox",
    "coding agent sandbox",
    "mcp sandbox",
)


def discover_hn_show_hn() -> list[dict]:
    out: list[dict] = []
    for query in HN_SHOW_QUERIES:
        q = urllib.parse.quote(query)
        url = f"https://hn.algolia.com/api/v1/search?query={q}&tags=show_hn&hitsPerPage=40"
        try:
            data = json.loads(fetch(url))
        except Exception as e:
            print("hn skip", query, e)
            continue
        for hit in data.get("hits", []):
            story_url = (hit.get("url") or "").strip()
            title = (hit.get("title") or "").strip()
            if not story_url.startswith("http"):
                continue
            low = (title + " " + story_url).lower()
            title_low = title.lower()
            if not any(
                k in title_low
                for k in (
                    "sandbox",
                    "microvm",
                    "firecracker",
                    "code execution",
                    "online judge",
                    "untrusted code",
                    "secure execution",
                )
            ):
                continue
            if any(
                k in low
                for k in (
                    "textworld",
                    "patchwave",
                    "taxonomy",
                    "awesome list",
                    "comparison",
                    "filterable list",
                    "music sequencing",
                    "windows",
                    "chunk sidecar",
                )
            ):
                continue
            if excluded(story_url, title):
                continue
            title_clean = re.sub(r"^Show HN:\s*", "", title, flags=re.I).strip()
            if "," in title_clean:
                title_clean = title_clean.split(",", 1)[0].strip()
            if len(title_clean) > 56 or title_clean.lower().startswith(
                ("i built", "the best", "run your", "what ", "map any", "new ")
            ):
                dom = norm_domain(story_url).split(".")[0]
                name = dom.replace("-", " ").title()[:80]
            else:
                name = title_clean[:80]
            name = name or norm_domain(story_url)
            out.append(
                {
                    "name": name,
                    "website": story_url,
                    "sources": [f"hn:show_hn:{query}"],
                    "extra": True,
                }
            )
    return out


BOXYARD_SLUG_URL = {
    "hopx": "https://hopx.ai",
    "e2b": "https://e2b.dev",
    "daytona": "https://www.daytona.io",
    "modal": "https://modal.com",
    "blaxel": "https://blaxel.ai",
    "vercel-sandbox": "https://vercel.com/docs/sandbox",
    "cloudflare-workers-sandbox": "https://developers.cloudflare.com/sandbox/",
    "runloop": "https://runloop.ai",
    "browserbase": "https://www.browserbase.com",
    "northflank": "https://northflank.com",
    "morph": "https://morphllm.com",
    "superserve": "https://superserve.ai",
    "agent-37": "https://www.agent37.com",
    "freestyle": "https://www.freestyle.sh",
    "beam": "https://beam.cloud",
    "opensandbox": "https://sandbox.alibaba.com",
}


SANDBOXINDEX_SLUG_URL = {
    "e2b": "https://e2b.dev",
    "daytona": "https://www.daytona.io",
    "modal": "https://modal.com",
    "vercel-sandbox": "https://vercel.com/docs/sandbox",
    "cloudflare-sandbox": "https://developers.cloudflare.com/sandbox/",
    "fly-sprites": "https://fly.io/sprites",
    "blaxel": "https://blaxel.ai",
    "runloop": "https://runloop.ai",
    "northflank": "https://northflank.com",
    "riza": "https://riza.io",
    "freestyle": "https://www.freestyle.sh",
    "together-sandbox": "https://www.together.ai/sandbox",
    "codesandbox-sdk": "https://codesandbox.io/docs/sdk",
    "microsandbox": "https://microsandbox.dev",
    "morph": "https://morphllm.com",
    "langsmith-sandboxes": "https://www.langchain.com/langsmith/sandboxes",
    "k8s-agent-sandbox": "https://agent-sandbox.sigs.k8s.io/",
}


def discover_sandboxindex() -> list[dict]:
    """sandboxindex.dev comparison table (20 services)."""
    out: list[dict] = []
    try:
        html = fetch("https://sandboxindex.dev/")
    except Exception as e:
        print("sandboxindex skip", e)
        return out
    for slug in sorted(set(re.findall(r'href="/s/([^/]+)/"', html))):
        if slug in EXCLUDE_SLUGS or slug in ("firecracker", "gvisor", "kata"):
            continue
        url = SANDBOXINDEX_SLUG_URL.get(slug)
        if not url:
            try:
                page = fetch(f"https://sandboxindex.dev/s/{slug}/")
                links = re.findall(r"https?://[a-z0-9.-]+\.[a-z]{2,}(?:/[^\"<\s]*)?", page, re.I)
                skip = ("sandboxindex", "buttondown", "github.com", "googletagmanager")
                links = [u for u in links if not any(s in u for s in skip)]
                url = links[0].split("/docs")[0].rstrip("/") if links else ""
            except Exception:
                url = ""
        if not url:
            continue
        name = slug.replace("-", " ").title()
        out.append({"name": name, "website": url, "sources": ["sandboxindex.dev"], "extra": True})
    return out


def discover_infraforagents() -> list[dict]:
    """InfraForAgents public catalog — sandboxes category (~95 products)."""
    out: list[dict] = []
    try:
        data = json.loads(fetch("https://infraforagents.com/api/v1/products.json"))
    except Exception as e:
        print("infraforagents skip", e)
        return out
    for p in data.get("products", []):
        cat_ids = p.get("categoryIds") or []
        if p.get("primaryCategoryId") != "sandboxes" and "sandboxes" not in cat_ids:
            continue
        name = (p.get("name") or "").strip()
        url = (p.get("url") or "").strip()
        if not name or not url or not url.startswith("http"):
            continue
        if excluded(url, name):
            continue
        if "github.com" in url and "OpenHands" not in name and "scitix" not in url.lower():
            # OSS references; keep only well-known harness repos
            if "software-agent-sdk" not in url and "Agent-Sandbox" not in url and "sandbox-python" not in url:
                continue
        out.append({"name": name, "website": url, "sources": ["InfraForAgents"], "extra": True})
    return out


def _boxyard_slug_website(slug: str) -> str:
    if slug in BOXYARD_SLUG_URL:
        return BOXYARD_SLUG_URL[slug]
    try:
        page = fetch(f"https://boxyard.dev/providers/{slug}")
    except Exception:
        return ""
    for u in re.findall(r'"url":"(https://[^"]+)"', page):
        if "boxyard.dev" in u or "bunnyshell.com" in u:
            continue
        host = norm_domain(u)
        if host and host != "boxyard.dev":
            return f"https://{host}"
    for u in re.findall(r'rel="noopener"[^>]*href="(https://[^"]+)"', page):
        if any(x in u for x in ("boxyard.dev", "github.com", "bunnyshell.com", "x.com", "twitter.com")):
            continue
        return u.split("/docs")[0].rstrip("/")
    return ""


def discover_boxyard() -> list[dict]:
    out: list[dict] = []
    try:
        xml = fetch("https://boxyard.dev/sitemap.xml")
    except Exception as e:
        print("boxyard skip", e)
        return out
    slugs = sorted(set(re.findall(r"/providers/([a-z0-9-]+)", xml)))
    # scrape missing slugs in parallel
    urls: dict[str, str] = dict(BOXYARD_SLUG_URL)
    todo = [s for s in slugs if s not in urls]
    if todo:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            for slug, site in zip(todo, pool.map(_boxyard_slug_website, todo)):
                if site:
                    urls[slug] = site
    for slug in slugs:
        url = urls.get(slug)
        if not url:
            continue
        name = slug.replace("-", " ").title()
        out.append({"name": name, "website": url, "sources": ["boxyard"], "extra": True})
    return out


def discover_crates_io() -> list[dict]:
    out: list[dict] = []
    for query in ("agent sandbox", "sandbox ai agent", "coding agent sandbox"):
        q = urllib.parse.quote(query)
        url = f"https://crates.io/api/v1/crates?q={q}&per_page=30"
        try:
            data = json.loads(fetch(url))
        except Exception as e:
            print("crates skip", query, e)
            continue
        for c in data.get("crates", []):
            name = c.get("name") or ""
            desc = (c.get("description") or "").lower()
            if "sandbox" not in desc or "agent" not in desc:
                continue
            if any(k in name for k in ("near-sandbox", "sandbox-jail", "offload")):
                continue
            detail_url = f"https://crates.io/api/v1/crates/{name}"
            try:
                meta = json.loads(fetch(detail_url))
                home = (meta.get("crate", {}).get("homepage") or "").strip()
                repo = (meta.get("crate", {}).get("repository") or "").strip()
            except Exception:
                home, repo = "", ""
            website = home if home.startswith("http") else repo if repo.startswith("http") else f"https://crates.io/crates/{name}"
            out.append({"name": name, "website": website, "sources": [f"crates.io:{query}"], "extra": True})
    return out


def discover_pypi() -> list[dict]:
    """Scrape PyPI search HTML for agent-sandbox packages."""
    out: list[dict] = []
    for query in ("agent sandbox", "sandbox agent", "code interpreter agent", "e2b", "microvm sandbox"):
        q = urllib.parse.quote(query)
        try:
            html = fetch(f"https://pypi.org/search/?q={q}&o=-created")
        except Exception as e:
            print("pypi skip", query, e)
            continue
        for pkg in re.findall(r'/project/([^/]+)/', html)[:40]:
            if any(x in pkg for x in ("linux", "win32", "darwin", "test", "stub")):
                continue
            try:
                meta = json.loads(fetch(f"https://pypi.org/pypi/{pkg}/json"))
            except Exception:
                continue
            info = meta.get("info", {})
            desc = (info.get("summary") or "").lower()
            if "sandbox" not in desc and "sandbox" not in pkg:
                continue
            if not any(k in desc + pkg for k in ("agent", "llm", "e2b", "modal", "daytona", "mcp", "untrusted", "code")):
                continue
            urls = info.get("project_urls") or {}
            website = (
                info.get("home_page")
                or urls.get("Homepage")
                or urls.get("Repository")
                or f"https://pypi.org/project/{pkg}/"
            )
            if not website.startswith("http"):
                continue
            if excluded(website, pkg):
                continue
            out.append({"name": info.get("name") or pkg, "website": website, "sources": [f"pypi:{query}"], "extra": True})
    return out


LANGCHAIN_INTEGRATION_NAMES: dict[str, str] = {
    "KubernetesSandbox": "BitKaio",
    "OpenShellSandbox": "OpenShell",
    "LangSmith sandbox": "LangSmith Sandboxes",
    "WBXSandbox": "WBX Sandbox",
    "RuntimeSandbox": "Runtime",
    "BriqSandbox": "Briq",
    "NoMacSandbox": "NoMac",
    "OpsenSandbox": "Opsen",
}

LANGCHAIN_LINK_TO_VENDOR = {
    "github.com/lizard-build": "https://lizard.build",
    "github.com/novitalabs": "https://novita.ai",
    "github.com/briq-cloud": "https://briq.cloud",
    "github.com/WBX-Sandbox": "https://sandbox.wbx.cz",
    "github.com/boxd-sh": "https://boxd.sh",
    "github.com/kosa8ai": "https://kosa8.com",
    "github.com/NoMac-app": "https://nomac.app",
    "github.com/always-further/langchain-nono": "https://nono.sh",
    "github.com/AyushSonuu/langchain-sandbox-opensandbox": "https://open-sandbox.ai",
    "gitlab.com/bitkaio": "https://bitkaio.com",
}


def _langchain_vendor_url(integration: str, link: str) -> str:
    link = link.split("?")[0].split("#")[0].rstrip("/")
    if "github.com" not in link and "gitlab.com" not in link:
        return link
    if integration == "OpenShellSandbox":
        return "https://docs.nvidia.com/openshell/latest/"
    if integration == "LangSmith sandbox":
        return "https://www.langchain.com/langsmith/sandboxes"
    if integration == "KubernetesSandbox":
        return "https://bitkaio.com" if "bitkaio" in link else "https://agent-sandbox.sigs.k8s.io/"
    for prefix, home in LANGCHAIN_LINK_TO_VENDOR.items():
        if prefix in link:
            return home
    # one GitHub API lookup for homepage
    m = re.match(r"https://github\.com/([^/]+/[^/]+)", link)
    if m:
        try:
            data = json.loads(
                fetch(f"https://api.github.com/repos/{m.group(1)}")
            )
            home = (data.get("homepage") or "").strip()
            if home.startswith("http"):
                return home
        except Exception:
            pass
    return link


def discover_langchain_sandboxes() -> list[dict]:
    """LangChain official sandbox integration index (Python + JS)."""
    out: list[dict] = []
    for path in (
        "https://docs.langchain.com/oss/python/integrations/sandboxes.md",
        "https://docs.langchain.com/oss/javascript/integrations/sandboxes.md",
    ):
        try:
            req = urllib.request.Request(
                path,
                headers={
                    "User-Agent": "sandbox-pricing-discovery/2.0",
                    "Accept": "text/markdown",
                },
            )
            md = fetch_url(req)
        except Exception as e:
            print("langchain skip", path, e)
            continue
        for integration, link in re.findall(r"\[`([^`]+)`\]\((https?://[^)]+)\)", md):
            if integration.endswith("sandbox") and "LangSmith" not in integration:
                pass
            website = _langchain_vendor_url(integration, link)
            name = LANGCHAIN_INTEGRATION_NAMES.get(integration)
            if not name:
                name = re.sub(r"(Sandbox|Backend)$", "", integration, flags=re.I).strip()
            if not name:
                name = integration
            if excluded(website, name):
                continue
            out.append(
                {
                    "name": name,
                    "website": website,
                    "sources": ["langchain-docs"],
                    "extra": True,
                }
            )
    return out


PRODUCT_HUNT_SANDBOXES = (
    ("Agent Sandbox", "https://agentsandbox.co"),
    ("CreateOS Sandbox", "https://createos.sh/products/sandbox"),
    ("Hopx", "https://hopx.ai"),
    ("Maritime", "https://maritime.dev"),
    ("box", "https://box.ascii.dev"),
    ("E2B", "https://e2b.dev"),
    ("Blaxel", "https://blaxel.ai"),
    ("Daytona", "https://www.daytona.io"),
    ("Modal", "https://modal.com"),
    ("Runloop", "https://runloop.ai"),
    ("ForeverVM", "https://forevervm.com"),
    ("Microsandbox", "https://microsandbox.dev"),
    ("Freestyle", "https://www.freestyle.sh"),
    ("Superserve", "https://superserve.ai"),
    ("Agent 37", "https://www.agent37.com"),
    ("Dedalus", "https://www.dedaluslabs.ai"),
    ("OpenSandbox", "https://open-sandbox.ai"),
    ("Tenki", "https://tenki.cloud"),
    ("Beam Sandboxes", "https://beam.cloud/sandbox"),
    ("Boxes.dev", "https://boxes.dev"),
    ("Northflank", "https://northflank.com/sandboxes"),
    ("Cloudflare Sandbox", "https://developers.cloudflare.com/sandbox/"),
    ("Vercel Sandbox", "https://vercel.com/docs/sandbox"),
    ("Browserbase", "https://www.browserbase.com"),
    ("Steel", "https://steel.dev"),
    ("Kernel", "https://onkernel.com"),
    ("Cua", "https://cua.ai"),
    ("Scrapybara", "https://scrapybara.com"),
    ("RunPod Sandboxes", "https://www.runpod.io"),
    ("Baseten", "https://www.baseten.co"),
)


def discover_product_hunt() -> list[dict]:
    """Curated Product Hunt launches (no public search API without token)."""
    out: list[dict] = []
    for name, url in PRODUCT_HUNT_SANDBOXES:
        if excluded(url, name):
            continue
        out.append({"name": name, "website": url, "sources": ["producthunt"], "extra": True})
    return out


GITHUB_TOPICS = (
    "agent-sandbox",
    "ai-sandbox",
    "coding-agent-sandbox",
    "firecracker-sandbox",
    "llm-sandbox",
    "mcp-sandbox",
    "agent-runtime",
    "code-interpreter",
)


def github_topic_search(topic: str, per_page: int = 50) -> list[dict]:
    q = urllib.parse.quote(f"topic:{topic}")
    url = f"https://api.github.com/search/repositories?q={q}&sort=stars&per_page={per_page}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "sandbox-pricing-discovery", "Accept": "application/vnd.github+json"},
    )
    try:
        data = json.loads(fetch_url(req))
    except Exception:
        return []
    out = []
    for r in data.get("items", []):
        name = r.get("full_name", "")
        home = (r.get("homepage") or "").strip()
        html = r.get("html_url", "")
        desc = (r.get("description") or "").lower()
        blob = f"{name} {desc} {home}".lower()
        if not any(
            k in blob
            for k in (
                "sandbox",
                "microvm",
                "firecracker",
                "code interpreter",
                "code execution",
                "untrusted code",
                "isolated execution",
                "agent runtime",
                "virtual machine for agent",
            )
        ):
            continue
        if any(k in name.lower() for k in ("overlaybd", "accelerated-container", "awesome", "taxonomy", "alive-bay")):
            continue
        website = home if home.startswith("http") else html
        if norm_domain(website) in ("pypi.org", "discord.gg", "vercel.app"):
            continue
        out.append(
            {
                "name": r.get("name") or name,
                "website": website,
                "sources": [f"github-topic:{topic}"],
                "extra": True,
                "github_stars": r.get("stargazers_count"),
            }
        )
    return out


def discover_github_topics() -> list[dict]:
    out: list[dict] = []
    for topic in GITHUB_TOPICS:
        out.extend(github_topic_search(topic))
    return out


def filter_agent_only(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        if r.get("slug") in EXCLUDE_SLUGS:
            continue
        url = r.get("website", "")
        name = r.get("name", "")
        if excluded(url, name):
            continue
        out.append(r)
    return out


def quality_filter(rows: list[dict]) -> list[dict]:
    """Drop weak npm/github hits that are SDK plugins, not sandbox providers."""
    keep = []
    for r in rows:
        src = " ".join(r.get("sources") or [])
        url = (r.get("website") or "").lower()
        name = (r.get("name") or "").lower()
        if r.get("profile"):  # agentsandboxes curated
            keep.append(r)
            continue
        if "roost" in src or "awesome" in src or "roost-map" in src:
            keep.append(r)
            continue
        if (
            src in ("web", "hosted", "docs", "cloud", "index", "compare-index", "InfraForAgents", "yc")
            or src.startswith("manual")
            or src.startswith("agentsandboxes.fyi")
            or src == "boxyard"
            or src.startswith("hn:")
            or src.startswith("yc:")
        ):
            keep.append(r)
            continue
        if (
            "yc" in src
            or "agentsandboxes.fyi" in src
            or "boxyard" in src
            or src.startswith("hn:")
            or "infraforagents" in src.lower()
            or "sandboxindex" in src.lower()
            or "pypi:" in src
            or "crates.io:" in src
            or "langchain-docs" in src
            or "producthunt" in src
        ):
            keep.append(r)
            continue
        if "npm:" in src:
            if any(k in name for k in ("plugin", "wardmote", "paperclip", "penclip", "test", "linux-x64", "darwin")):
                continue
            slug = (r.get("slug") or "").lower()
            if slug.endswith("-e2b") or "mastra-e2b" in slug or "sandbox-e2b" in slug:
                continue
            if not any(k in name + url for k in ("sandbox", "e2b", "daytona", "modal", "microvm", "sandock", "tinysandbox")):
                continue
        if "github:" in src:
            stars = r.get("github_stars") or 0
            if stars < 3 and "sandbox" not in name:
                continue
            if any(k in name for k in ("taxonomy", "awesome", "benchmark", "comparison", "website")):
                continue
        if "github-topic:" in src and not r.get("profile"):
            topic_blob = name + " " + url
            if "sandbox" not in name and "sandbox" not in url:
                if not re.search(
                    r"microvm|firecracker|interpreter|codebox|containarium|smolvm",
                    topic_blob,
                    re.I,
                ):
                    continue
        keep.append(r)
    return keep


def main() -> None:
    existing = load_existing()
    if SCRAPE_CACHE.exists():
        existing, _ = merge_entries(existing, json.loads(SCRAPE_CACHE.read_text()))
    discoveries: list[dict] = []

    # Awesome lists
    for raw_url, label in (
        ("https://raw.githubusercontent.com/arjan/awesome-agent-sandboxes/main/README.md", "awesome-arjan"),
        ("https://raw.githubusercontent.com/fhiltscher/awesome-ai-coding-sandboxes/main/README.md", "awesome-fhiltscher"),
        ("https://raw.githubusercontent.com/comparesandboxes/awesome-sandboxes/main/README.md", "awesome-comparesandboxes"),
    ):
        try:
            discoveries.extend(parse_markdown_links(fetch(raw_url), label))
        except Exception as e:
            print("skip", label, e)

    # roost.guide
    try:
        roost = fetch("https://roost.guide/agent-sandboxes/features/index.md")
        discoveries.extend(parse_roost_table(roost))
    except Exception as e:
        cached = Path.home() / ".cursor/projects/Users-nabhag-OpenSource-sandbox-pricing/agent-tools/3660b158-2b2d-4fd7-b1b2-b079260e22b9.txt"
        if cached.exists():
            discoveries.extend(parse_roost_table(cached.read_text()))
        else:
            print("roost skip", e)

    discoveries.extend(discover_infraforagents())
    discoveries.extend(discover_sandboxindex())
    discoveries.extend(discover_yc_startups())
    discoveries.extend(discover_agentsandboxes_fyi())
    discoveries.extend(discover_boxyard())
    discoveries.extend(discover_hn_show_hn())
    discoveries.extend(discover_crates_io())
    discoveries.extend(discover_pypi())
    discoveries.extend(discover_langchain_sandboxes())
    discoveries.extend(discover_product_hunt())
    discoveries.extend(discover_github_topics())

    for name, url, src in MANUAL_SEED:
        discoveries.append({"name": name, "website": url, "sources": [src], "extra": True})

    for pname, purl in ROOST_NAME_TO_URL.items():
        discoveries.append({"name": pname, "website": purl, "sources": ["roost-map"], "extra": True})

    # GitHub
    for q in (
        "agent sandbox",
        "ai agent sandbox microvm",
        "firecracker agent sandbox",
        "llm code execution sandbox",
        "e2b sandbox",
        "coding agent sandbox",
        "mcp sandbox execution",
        "opensandbox alibaba",
        "firecracker sandbox api",
        "agent computer sandbox",
        "microsandbox",
        "sandbox-as-a-service",
        "langsmith sandbox",
        "railway sandboxes",
    ):
        discoveries.extend(github_search(q))

    # npm
    for term in (
        "agent sandbox",
        "e2b code-interpreter",
        "daytona sandbox",
        "modal sandbox",
        "@e2b/code-interpreter",
        "microvm sandbox agent",
        "mcp sandbox",
    ):
        discoveries.extend(npm_search(term))

    merged, added = merge_entries(existing, discoveries)
    merged = filter_agent_only(merged)
    merged = quality_filter(merged)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(merged, indent=2))
    print(f"total={len(merged)} newly_added={added} -> {OUT}")


if __name__ == "__main__":
    main()