---
name: uv-python-commands
description: Run Python via uv run to avoid touching system Python. Use for one-off execution (scripts, inline commands, stdin/heredocs) and ephemeral deps; avoid system-wide installs.
---

# Uv Python Commands

## Overview

Standardize ad-hoc Python execution through uv so system Python remains untouched. Use this skill for one-off runs (script paths, modules, inline code, stdin/heredocs) and temporary dependencies.

Boundary:
- Use `uv-python-scripts` for standalone script authoring and maintenance (`uv init --script`, `uv add --script`, `uv lock --script`, shebang workflows, script reproducibility metadata).
- Use `uv-python-projects` for project lifecycle tasks in `pyproject.toml` (`uv add`, `uv remove`, `uv lock`, `uv sync`).

## Workflow

### 1) Default to uv for any Python execution

Use uv for:
- Running scripts: `uv run path/to/script.py`
- Inline commands: `uv run python -c 'print("hi")'`
- One-off tools: `uv run --with <pkg> python -c '...'`

Avoid `python`, `pip`, or `pip3` directly unless the user explicitly requests system Python.

### 2) Prefer ephemeral deps for ad-hoc work

When a script needs a package that is not available, prefer:

```bash
uv run --with <pkg> path/to/script.py
```

Use multiple `--with` flags as needed.

Constraints are allowed when needed, e.g. `uv run --with 'rich>12,<13' path/to/script.py`.

### 3) Handle project behavior deliberately

If a `pyproject.toml` is present, `uv run` installs the current project before executing.

- Use `uv run --no-project path/to/script.py` for clean ad-hoc execution.
- Place `--no-project` before the script path.

### 4) Reach for additional options when needed

- Use `--python <version>` to request a specific interpreter per run.
- Use `--with-requirements requirements.txt` for quick one-off installs from a file.
- Use `--with-editable path/` for editable local packages.
- Use `--isolated` to force a temporary venv (avoid using a project env).
- Use `--env-file .env` to load environment variables.
- Use `-m/--module` to match `python -m` (`uv run -m http.server`).
- Use `--locked` or `--frozen` when lockfile changes are disallowed.

### 5) Escalate only when necessary

If uv needs to fetch packages (network access), request approval before running commands that will download dependencies.

## Examples

Run a script:

```bash
uv run scripts/generate_report.py
```

Run inline Python with a dependency:

```bash
uv run --with pyyaml python -c 'import yaml; print(yaml.safe_load("a: 1"))'
```

Run a project-adjacent script without installing the project:

```bash
uv run --no-project scripts/scratch.py
```

Multiple packages:

```bash
uv run --with requests --with pandas python -c 'import requests, pandas'
```

Run inline Python from stdin:

```bash
echo 'print("hello world!")' | uv run -
```

Run inline Python with a heredoc:

```bash
uv run - <<EOF
print("hello world!")
EOF
```

Run a module entry point:

```bash
uv run -m http.server 8000
```
