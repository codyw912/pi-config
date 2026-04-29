#!/usr/bin/env python3
from pathlib import Path
import re

text = Path("docs/catalog.md").read_text()
broken = []
for match in re.finditer(r"\[[^\]]*\]\(([^)]+)\)", text):
    target = match.group(1)
    if target.startswith(("http://", "https://", "#")):
        continue
    if not (Path("docs") / target).resolve().exists():
        broken.append(target)

if broken:
    print("Broken catalog links:")
    print("\n".join(broken))
    raise SystemExit(1)

print("catalog links ok")
