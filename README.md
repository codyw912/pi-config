# pi-config

Curated Pi agent configuration for an agentic coding stack.

This repo is intended to make the stack easy to inspect, install, and keep in sync. It contains local Pi agents, skills, extensions, and operating guidance, plus first-class tracking for package-managed dependencies. It intentionally does **not** include private runtime state such as sessions, auth files, caches, local git mirrors, or run history.

## What's in the stack?

Start here:

- [`docs/catalog.md`](docs/catalog.md) — generated catalog of packages, custom local extensions/agents/skills, and a consolidated Compound Engineering section.
- [`docs/pi-packages.md`](docs/pi-packages.md) — package-managed dependencies, source links, and optional/discovered packages.
- [`docs/privacy-audit-2026-04-28.md`](docs/privacy-audit-2026-04-28.md) — public-sharing privacy audit notes.

Highlights:

- **Council workflow** — premium advisory council agents plus `council-tools.ts` for async completion notifications and `Alt+O` / `/council-runs` browsing.
- **Compound Engineering plugin resources** — brainstorm, plan, work, review, commit/PR, debug, demo evidence, docs refresh, and related review personas. These are consolidated in the catalog and linked to the official CE repo rather than presented as custom config.
- **Safety/ergonomics extensions** — command guardrails and council review UI.
- **Package-managed tools** — subagents, ask-user, web access, intercom, FFF search, LSP, themes, and selected git-installed extensions.

## Included

- `agent/AGENTS.md` — global Pi/CE compatibility instructions.
- `agent/APPEND_SYSTEM.md` — appended system prompt / operating guidance.
- `agent/agents/` — local subagent definitions.
- `agent/skills/` — Pi/CE-specific local skills.
- `shared-skills/` — cross-harness skills mirrored from `~/.agents/skills` for visibility and sharing.
- `agent/extensions/` — local Pi extensions.
- `config/pi-packages.txt` — default npm/git Pi package dependencies.
- `config/pi-packages.optional.txt` — optional/discovered package refs.

Common cross-harness skills are tracked in `shared-skills/` but should live at `~/.agents/skills` on each machine. Pi discovers that location directly, and other harnesses can share it too.

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

### 2. Install shared cross-harness skills

These copy to `~/.agents/skills`, where Pi and other harnesses auto-discover them:

```bash
./scripts/install-shared-skills.sh --dry-run
./scripts/install-shared-skills.sh
```

### 3. Symlink curated local config

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

Regenerate the catalog after adding/removing agents, skills, extensions, packages, or shared skills:

```bash
python3 scripts/update-catalog.py
# or
npm run catalog
```

To refresh the tracked shared-skill mirror from your machine's common skill directory:

```bash
./scripts/sync-shared-skills.sh --dry-run
./scripts/sync-shared-skills.sh
python3 scripts/update-catalog.py
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
