#!/usr/bin/env python3
"""Build merged agent sandbox provider list from agentsandboxes scrape + extras."""

import json
import re
import sys
from datetime import date
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from provider_taxonomy import CAT_BY_SLUG

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "public" / "agent-sandbox-providers.json").read_text())

EXCLUDE_DOMAINS = {"computesdk.com", "vibekit.sh", "agentsandbox.net", "agents.one"}

extras = [
    ("Buildsable (Sable) Sandbox", "https://www.buildsable.com/docs/sandboxes", "Hosted code sandbox + receipts", "Web"),
    ("Capy", "https://capy.ai", "Cloud machines / agent swarms (Scrapybara)", "Web"),
    ("LangSmith Sandboxes", "https://www.langchain.com/langsmith/sandboxes", "LangChain microVM sandboxes", "Web"),
    ("Lizard Sandboxes", "https://lizard.build", "Low-cost Firecracker sandboxes", "Web"),
    ("Nanite", "https://nanite.run", "Fast Linux sandbox API", "Web"),
    ("Sandbox as a Service (AAS)", "https://sandbox-as-a-service.com", "MicroVM sandbox API", "Web"),
    ("SandboxAPI", "https://sandboxapi.dev", "gVisor code execution API (RapidAPI)", "Web"),
    ("Simular Box", "https://box.simular.ai", "MCP cloud desktop for agents", "Web"),
    ("Bouvet", "https://github.com/vrn21/bouvet", "Self-host MCP Firecracker sandboxes", "GitHub"),
    ("Agent37 Sandboxes", "https://www.agent37.dev", "Persistent agent sandboxes", "InfraForAgents"),
    ("Miosa Sandboxes", "https://miosa.ai", "MicroVM API sandboxes", "InfraForAgents"),
    ("Mosaic Sandboxes", "https://mosaic.so", "Managed Linux sandboxes", "InfraForAgents"),
    ("OmniRun", "https://omnirun.com", "Firecracker sandbox API", "InfraForAgents"),
    ("OpenPond Sandbox Compute", "https://openpond.io", "Cloud sandboxes SDK", "InfraForAgents"),
    ("PandaStack", "https://pandastack.io", "MicroVM OSS + hosted", "InfraForAgents"),
    ("PPIO Sandbox", "https://ppio.cloud", "Code/browser agent sandboxes", "InfraForAgents"),
    ("Sandbox0", "https://sandbox0.dev", "Checkpoint pause/resume", "InfraForAgents"),
    ("Shellbox", "https://shellbox.sh", "SSH-controlled microVMs", "InfraForAgents"),
    ("Instabox", "https://instabox.dev", "Agent workspace machines", "InfraForAgents"),
    ("Nodus Compute Sandboxes", "https://nodus.computer", "MCP/CLI sandboxes", "InfraForAgents"),
    ("Orkestr Sandboxes", "https://orkestr.io", "Managed Linux sandboxes", "InfraForAgents"),
    ("Runta Runtimes", "https://runta.sh", "Agent runtime API", "InfraForAgents"),
    ("Sailboxes", "https://sailboxes.dev", "VMs with checkpoints", "InfraForAgents"),
    ("ScitiX Agent Sandbox", "https://scitix.com", "K8s E2B-compatible", "InfraForAgents"),
    ("Solari Sandboxes", "https://solari.run", "Stateful SDK sandboxes", "InfraForAgents"),
    ("Tangle Sandboxes", "https://tangle.so", "Linux sandbox SDK", "InfraForAgents"),
    ("YepCode Run", "https://yepcode.io/products/run", "Hosted JS/Python sandboxes", "InfraForAgents"),
    ("Huawei Cloud AgentArts", "https://www.huaweicloud.com/intl/en-us/product/agentarts.html", "Browser sandbox for agents", "InfraForAgents"),
    ("CodeSandbox SDK", "https://codesandbox.io/docs/sdk", "VM sandboxes from CodeSandbox", "sandboxindex"),
    ("Prime Sandboxes", "https://www.primeintellect.ai", "RL-scale microVM sandboxes", "agentsandboxes"),
]


def norm_domain(url: str) -> str:
    if not url:
        return ""
    u = url.lower().rstrip("/")
    u = u.split("://", 1)[-1]
    return u.split("/")[0]


data = [d for d in data if norm_domain(d.get("website", "")) not in EXCLUDE_DOMAINS]

cat_by_slug = CAT_BY_SLUG

deprecated = {"runloop", "riza", "deno-sandbox", "val-town", "langchain-sandbox", "scrapybara"}

for d in data:
    d["category_guess"] = cat_by_slug.get(d["slug"], d.get("category") or "Other / verify category")

data.sort(key=lambda x: (x.get("category_guess", ""), x["name"].lower()))

lines = [
    "# AI Agent Sandbox Providers (crawler inventory)",
    "",
    f"Compiled **{len(data)}** unique providers/runtimes on {date.today().isoformat()}.",
    "",
    "**Scope:** isolated environments for running **AI agent** code, shells, interpreters, browsers/desktops, or self-hosted sandbox runtimes. **Excluded:** CI-only platforms with no agent sandbox product (e.g. vanilla GitHub Actions runners).",
    "",
    "**Sources crawled:** [agentsandboxes.org](https://agentsandboxes.org/) sitemap, [InfraForAgents](https://infraforagents.com/api/v1/products.json) sandboxes catalog (~95), [sandboxindex.dev](https://sandboxindex.dev/), [LangChain sandboxes](https://docs.langchain.com/oss/python/integrations/sandboxes), Product Hunt, [boxyard.dev](https://boxyard.dev), [agentsandboxes.fyi](https://agentsandboxes.fyi), YC (Algolia), HN Show HN, awesome lists, roost.guide, PyPI, crates.io, GitHub topics, npm, and GitHub.",
    "",
    "| # | Provider | Category | Link | Profile / notes |",
    "|---|----------|----------|------|-----------------|",
]

for i, d in enumerate(data, 1):
    name = d.get("display_name") or d["name"]
    cat = d.get("category_guess", "")
    link = d.get("website") or ""
    prof = d.get("profile") or ""
    note_parts = []
    ws = d.get("website_status")
    if ws == "broken":
        note_parts.append("**link does not work**")
    elif ws == "blocked":
        note_parts.append("link blocked in automated check (may work in browser)")
    elif ws == "redirect":
        final = (d.get("website_check") or {}).get("final_url")
        if final and norm_domain(final) != norm_domain(link):
            note_parts.append(f"redirects to {final}")
    if d.get("slug") in deprecated:
        note_parts.append("winding down / discontinued hosted API — verify")
    elif d.get("extra") and ws not in ("broken",):
        note_parts.append("beyond agentsandboxes sitemap — verify URL")
    if prof:
        note_parts.append(f"[agentsandboxes profile]({prof})")
    note = "; ".join(note_parts)
    lines.append(f"| {i} | {name} | {cat} | [{link}]({link}) | {note} |")

(ROOT / "AGENT_SANDBOX_PROVIDERS.md").write_text("\n".join(lines) + "\n")
print(f"wrote {len(data)} providers")