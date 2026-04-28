#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_AGENT="${PI_AGENT:-$HOME/.pi/agent}"
BACKUP_ROOT="$ROOT/.backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP"
DRY_RUN=0

usage() {
  cat <<USAGE
Usage: ./install.sh [--dry-run]

Symlink curated Pi agent configuration from this repo into \$PI_AGENT.
Existing live paths are backed up under .backups/<timestamp>/ before replacement.

Environment:
  PI_AGENT   Override target directory (default: \$HOME/.pi/agent)
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; usage; exit 1 ;;
  esac
done

say() { printf '%s\n' "$*"; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] %q' "$1"
    shift || true
    for arg in "$@"; do printf ' %q' "$arg"; done
    printf '\n'
  else
    "$@"
  fi
}

link_path() {
  local rel="$1"
  local src="$ROOT/agent/$rel"
  local dest="$PI_AGENT/$rel"

  if [ ! -e "$src" ]; then
    echo "Missing source: $src" >&2
    exit 1
  fi

  say "Linking $dest -> $src"

  if [ -e "$dest" ] || [ -L "$dest" ]; then
    local backup_dest="$BACKUP/$rel"
    run mkdir -p "$(dirname "$backup_dest")"
    run mv "$dest" "$backup_dest"
    say "  backed up existing path to $backup_dest"
  fi

  run mkdir -p "$(dirname "$dest")"
  run ln -s "$src" "$dest"
}

say "Pi config repo: $ROOT"
say "Target Pi agent dir: $PI_AGENT"
if [ "$DRY_RUN" -eq 1 ]; then
  say "Mode: dry run"
else
  mkdir -p "$PI_AGENT" "$BACKUP_ROOT"
fi

link_path "AGENTS.md"
link_path "APPEND_SYSTEM.md"
link_path "agents"
link_path "skills"
link_path "extensions"

say ""
say "Note: shared cross-harness skills live in $ROOT/shared-skills."
say "Pi auto-discovers skills from ~/.agents/skills, so copy or sync those separately if desired."
if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run complete. No files changed."
else
  say "Install complete. Backup: $BACKUP"
  say "Run /reload in Pi to reload extensions and prompts."
fi
