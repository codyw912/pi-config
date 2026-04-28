#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_FILE="${1:-$ROOT/config/pi-packages.txt}"
DRY_RUN=0

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
  PACKAGE_FILE="${2:-$ROOT/config/pi-packages.txt}"
fi

if [ ! -f "$PACKAGE_FILE" ]; then
  echo "Package file not found: $PACKAGE_FILE" >&2
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  package="${line%%#*}"
  package="$(printf '%s' "$package" | xargs)"
  [ -n "$package" ] || continue

  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] pi install %q\n' "$package"
  else
    pi install "$package"
  fi
done < "$PACKAGE_FILE"
