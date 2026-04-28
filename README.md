# pi-config

Curated Pi agent configuration for an agentic coding stack.

This repo is intended to make the stack easy to inspect, install, and keep in sync. It contains local Pi agents, skills, extensions, and operating guidance, plus first-class tracking for package-managed dependencies. It intentionally does **not** include private runtime state such as sessions, auth files, caches, local git mirrors, or run history.

## What's in the stack?

Start here:

- [`docs/catalog.md`](docs/catalog.md) — generated catalog of packages, extensions, agents, and skills with short purpose notes.
- [`docs/pi-packages.md`](docs/pi-packages.md) — package-managed dependencies, source links, and optional/discovered packages.
- [`docs/privacy-audit-2026-04-28.md`](docs/privacy-audit-2026-04-28.md) — public-sharing privacy audit notes.

Highlights:

- **Council workflow** — premium advisory council agents plus `council-tools.ts` for async completion notifications and `Alt+O` / `/council-runs` browsing.
- **CE workflow skills** — brainstorm, plan, work, review, commit/PR, debug, demo evidence, docs refresh, and related review personas.
- **Safety/ergonomics extensions** — command guardrails and council review UI.
- **Package-managed tools** — subagents, ask-user, web access, intercom, FFF search, LSP, themes, and selected git-installed extensions.

## Included

- `agent/AGENTS.md` — global Pi/CE compatibility instructions.
- `agent/APPEND_SYSTEM.md` — appended system prompt / operating guidance.
- `agent/agents/` — local subagent definitions.
- `agent/skills/` — Pi/CE-specific local skills.
- `agent/extensions/` — local Pi extensions.
- `config/pi-packages.txt` — default npm/git Pi package dependencies.
- `config/pi-packages.optional.txt` — optional/discovered package refs.

Common cross-harness skills should live in `~/.agents/skills`, not in this repo. Pi discovers those directly, and other harnesses can share them from the same location.

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

The package list lives in `config/pi-packages.txt`. Optional/discovered packages that are not part of the default stack live in `config/pi-packages.optional.txt`.

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

## Maintain the catalog

Regenerate the catalog after adding/removing agents, skills, extensions, or packages:

```bash
python3 scripts/update-catalog.py
# or
npm run catalog
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

Before sharing publicly, run a quick scan for secrets/local-only paths:

```bash
grep -RInE '(api[_-]?key|secret|token|password|bearer|sk-[A-Za-z0-9]|AIza)' agent || true
grep -RInE '/Users/[^[:space:]]+|/var/folders' agent || true
```

Most matches should be instructional examples, not real credentials. Review before pushing.
