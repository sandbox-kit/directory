#!/usr/bin/env python3
"""Re-run metadata enrichment on public/agent-sandbox-providers.json (no HTTP checks)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from provider_enrich import enrich_rows

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "agent-sandbox-providers.json"

rows = json.loads(OUT.read_text())
kept, removed = enrich_rows(rows)
OUT.write_text(json.dumps(kept, indent=2))
print(f"enriched {len(kept)} providers ({len(removed)} removed as non-vendors)")