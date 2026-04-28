# pi-config

Curated Pi agent configuration for an agentic coding stack.

This repo is intended to be the source of truth for shareable Pi agent behavior: prompts, agents, skills, and extensions. It intentionally does **not** include private runtime state such as sessions, auth files, caches, local git mirrors, or run history.

## Included

- `agent/AGENTS.md` — global Pi/CE compatibility instructions
- `agent/APPEND_SYSTEM.md` — appended system prompt / operating guidance
- `agent/agents/` — custom subagent definitions
- `agent/skills/` — Pi/CE-specific curated skills

Common cross-harness skills should live in `~/.agents/skills`, not in this repo. Pi discovers those directly, and other harnesses can share them from the same location.
- `agent/extensions/` — custom Pi extensions

## Excluded

Do not commit these from `~/.pi/agent`:

- `auth.json`
- `settings.json`, `models.json`, `lsp.json`, `.pi-lsp.json`
- `sessions/`
- `git/`
- `.cache/`, `bench-reports/`, `intercom/`
- `run-history.jsonl`
- personal scratch files

## Install

### 1. Install package dependencies

Pi packages installed from npm/git are not vendored into this repo. Install them from their source refs:

```bash
./scripts/install-packages.sh --dry-run
./scripts/install-packages.sh
```

The package list lives in `config/pi-packages.txt`. Optional/discovered packages that are not part of the default stack live in `config/pi-packages.optional.txt`. See `docs/pi-packages.md` for first-class package tracking, source links, and notes.

### 2. Symlink curated local config

Dry-run first:

```bash
./install.sh --dry-run
```

Then install symlinks:

```bash
./install.sh
```

The installer backs up any existing live paths to `.backups/<timestamp>/` before replacing them with symlinks.

After installing, reload Pi:

```text
/reload
```

## Update workflow

Because the live Pi setup is symlinked to this repo, edits through either path are repo edits:

```bash
cd ~/dev/pi-config
git status
git add .
git commit -m "Update pi agent stack"
git push
```

## Safety notes

Before sharing publicly or with a friend, run a quick scan for secrets/local-only paths:

```bash
grep -RInE '(api[_-]?key|secret|token|password|bearer|sk-[A-Za-z0-9]|AIza)' agent || true
grep -RInE '/Users/[^[:space:]]+|/var/folders' agent || true
```

Most matches should be instructional examples, not real credentials. Review before pushing.
