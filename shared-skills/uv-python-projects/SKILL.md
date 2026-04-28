---
name: uv-python-projects
description: "Manage uv for Python projects: initialize projects, manage dependencies/groups/extras, lock and sync environments, workspaces, and Python versions. Use when working in a repo with a pyproject.toml or when setting up and maintaining project environments; not for one-off runs."
---

# Uv Python Projects

## Overview

Use uv for project lifecycle tasks while keeping system Python untouched. Prefer this skill for project setup, dependency management, and lockfile workflows; use uv-python-commands for one-off execution and uv-python-scripts for standalone script workflows.

Script boundary:
- Use this skill for project-managed dependencies in `pyproject.toml`.
- Use uv-python-scripts for standalone script workflows (`uv init --script`, `uv add --script`, `uv lock --script`, shebang scripts, script metadata).
- Use uv-python-commands for ad-hoc execution (`uv run`, inline Python, stdin/heredocs, temporary `--with` installs).

## Workflow

### 1) Identify project context or initialize one

If no project exists, initialize:
- `uv init` (optionally `--app`, `--lib`, or `--package`)

If a project exists, sync the environment:
- `uv sync`

### 2) Manage dependencies

Default to newest versions unless a specific version is required. Use `uv add` so uv resolves the latest compatible release and updates `pyproject.toml` consistently. Avoid manual edits to `pyproject.toml` for dependency changes unless uv cannot express the update; if you must edit manually, explain why.

Add packages:
- `uv add <pkg>`
- `uv add --dev <pkg>` for dev deps
- `uv add --group <name> <pkg>` for dependency groups
- `uv add --optional <extra> <pkg>` for extras
- `uv add -r requirements.txt` to import from a file

Remove packages:
- `uv remove <pkg>`

### 3) Avoid the uv pip interface (legacy only)

Use `uv pip` only for legacy compatibility when there is no uv-native command. Do not use it in uv-native projects by default. If it is truly required, state why and prefer migrating to `uv add/remove/lock/sync` at the next opportunity.

### 4) Lock and sync

About `uv.lock`:
- A universal (cross-platform) lockfile that records exact resolved versions for all markers
- Managed by uv; do not edit manually
- Created/updated by `uv sync`, `uv run`, or explicitly with `uv lock`
- In a workspace, a single `uv.lock` lives at the workspace root
- Commit it to version control for reproducible installs; export if other tools need it (e.g. `uv export -o requirements.txt` or `uv export -o pylock.toml`)

Keep lockfile up to date:
- `uv lock`

Sync to lockfile:
- `uv sync`
- Use `--frozen` or `--locked` for deterministic CI runs
- Use `--check` to verify the environment matches the project

### 5) Python versions

Manage interpreters with uv:
- `uv python list`
- `uv python install 3.12`
- `uv python pin 3.12`

When syncing or locking, prefer uv-managed Python if the project requires a specific version.

### 6) Workspaces and packages

For monorepos:
- `uv sync --all-packages`
- `uv sync --package <name>`
- `uv add --package <name> <pkg>`

### 7) Handle scripts inside projects deliberately

When running a plain script from a project directory:

- `uv run path/to/script.py` includes project installation/dependencies.
- `uv run --no-project path/to/script.py` runs without project context.

When a script has inline metadata (`# /// script`), uv treats it as a standalone script and ignores project dependencies.

For creating and maintaining script metadata, use uv-python-scripts.

### 8) Escalate only when necessary

If uv needs to download packages or Python versions (network access), request approval before running the command.

## Examples

Initialize a new app project:

```bash
uv init --app my-service
```

Add runtime and dev deps:

```bash
uv add fastapi
uv add --dev ruff
```

Lock and sync:

```bash
uv lock
uv sync --frozen
```
