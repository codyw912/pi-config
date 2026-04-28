#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/shared-skills"
DEST="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
DRY_RUN=0

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi

if [ ! -d "$SRC" ]; then
  echo "Bundled shared skills not found: $SRC" >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  rsync -ani --delete --exclude '.git' --exclude 'node_modules' "$SRC/" "$DEST/"
else
  mkdir -p "$DEST"
  rsync -a --delete --exclude '.git' --exclude 'node_modules' "$SRC/" "$DEST/"
fi
