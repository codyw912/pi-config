#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$HOME/.agents/skills}"
DEST="$ROOT/shared-skills"
DRY_RUN=0

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
  SRC="${2:-$HOME/.agents/skills}"
fi

if [ ! -d "$SRC" ]; then
  echo "Shared skills source not found: $SRC" >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  rsync -ani --delete --exclude '.git' --exclude 'node_modules' "$SRC/" "$DEST/"
else
  mkdir -p "$DEST"
  rsync -a --delete --exclude '.git' --exclude 'node_modules' "$SRC/" "$DEST/"
fi
