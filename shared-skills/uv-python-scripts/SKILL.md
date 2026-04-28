---
name: uv-python-scripts
description: Manage standalone Python scripts with uv using PEP 723 metadata, script dependencies, shebang execution, lockfiles, and reproducibility controls.
---

# Uv Python Scripts

## Overview

Use this skill for standalone Python script workflows managed by uv. This includes creating script metadata, declaring script dependencies in-file, locking script dependencies, and making scripts executable.

Boundary:
- Use `uv-python-commands` for one-off command execution (`uv run ...`, inline commands, stdin/heredocs, temporary `--with` installs).
- Use `uv-python-projects` for `pyproject.toml` project lifecycle work.

## Workflow

### 1) Initialize script metadata (PEP 723)

Create a script with inline metadata:

```bash
uv init --script path/to/script.py --python 3.12
```

This adds a `# /// script` block that uv reads for script requirements.

### 2) Declare dependencies in the script

Add or update script dependencies with uv:

```bash
uv add --script path/to/script.py requests rich
```

Guidance:
- Keep script requirements in inline metadata, not separate notes.
- Include `dependencies` even when empty.
- Use constraints when needed (for example, `requests<3`).

### 3) Run script with metadata-aware resolution

Run the script normally:

```bash
uv run path/to/script.py
```

Behavior notes:
- For inline-metadata scripts, uv uses script requirements and ignores project dependencies even inside a project directory.
- Request a specific interpreter with `uv run --python <version> path/to/script.py` when needed.

### 4) Make scripts executable via shebang

For scripts that should run directly from `PATH`:

```python
#!/usr/bin/env -S uv run --script
```

Then mark executable (`chmod +x path/to/script`).

### 5) Lock script dependencies explicitly

Create a lockfile next to the script:

```bash
uv lock --script path/to/script.py
```

This writes `path/to/script.py.lock`.

Commands like `uv run --script`, `uv add --script`, `uv export --script`, and `uv tree --script` will reuse and update this lockfile as needed.

### 6) Improve reproducibility and index control

- Add `[tool.uv] exclude-newer = "<RFC3339 timestamp>"` in inline metadata to avoid newer distributions after a cutoff date.
- Use `uv add --script --index <url> ...` for alternative package indexes.

### 7) Escalate only when necessary

If uv needs to download packages or Python versions (network access), request approval before running the command.

## Examples

Initialize a script and add dependencies:

```bash
uv init --script scripts/fetch_peps.py --python 3.12
uv add --script scripts/fetch_peps.py requests rich
uv run scripts/fetch_peps.py
```

Pin script deps with a lockfile:

```bash
uv lock --script scripts/fetch_peps.py
```

Use an alternative index:

```bash
uv add --script --index "https://example.com/simple" scripts/fetch_peps.py httpx
```
