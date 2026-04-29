#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

settings = Path.home() / ".pi/agent/settings.json"
desired = [
    line.split("#", 1)[0].strip()
    for line in Path("config/pi-packages.txt").read_text().splitlines()
]
desired = [item for item in desired if item]

live: list[str] = []
if settings.exists():
    data = json.loads(settings.read_text())
    for item in data.get("packages", []):
        if isinstance(item, str):
            live.append(item)
        elif isinstance(item, dict) and "source" in item:
            live.append(str(item["source"]))

print("Missing from live settings:")
missing = sorted(set(desired) - set(live))
print("\n".join(f"  {item}" for item in missing) or "  none")

print("Present live but not tracked in config/pi-packages.txt:")
extra = sorted(set(live) - set(desired))
print("\n".join(f"  {item}" for item in extra) or "  none")

raise SystemExit(1 if missing or extra else 0)
