# pi-config maintenance commands

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Show available commands
_default:
    @just --list

# One-command local sync: pull shared skills into repo, regenerate catalog, validate public hygiene, audit package list, show git status
sync:
    ./scripts/sync-shared-skills.sh
    just check
    just packages-audit
    just status

# Regenerate docs/catalog.md from tracked local/shared skills
catalog:
    uv run python scripts/update-catalog.py

# Check repo hygiene and public-sharing scans
check: catalog
    bash -n install.sh
    bash -n scripts/install-packages.sh
    bash -n scripts/install-shared-skills.sh
    bash -n scripts/sync-shared-skills.sh
    uv run python -m py_compile scripts/update-catalog.py
    @echo "Checking catalog links..."
    uv run python scripts/check-catalog-links.py
    @echo "Scanning for high-signal personal paths..."
    @if git grep -n -I -E '(/Users/cody|/Users/[A-Za-z0-9._-]+/\.pi|/Users/[A-Za-z0-9._-]+/dev|/home/[A-Za-z0-9._-]+/\.pi)' -- . ':!justfile' ':!docs/privacy-audit-2026-04-28.md'; then exit 1; else echo "personal path scan ok"; fi
    @echo "Scanning for high-signal secrets..."
    @if git grep -n -I -E '(sk-[A-Za-z0-9_-]{30,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----|Bearer [A-Za-z0-9._-]{20,})'; then exit 1; else echo "secret scan ok"; fi

# Dry-run installing package dependencies through pi install
packages-dry-run:
    ./scripts/install-packages.sh --dry-run

# Install package dependencies through pi install
packages-install:
    ./scripts/install-packages.sh

# Dry-run installing optional/discovered package dependencies
optional-packages-dry-run:
    ./scripts/install-packages.sh --dry-run config/pi-packages.optional.txt

# Install optional/discovered package dependencies
optional-packages-install:
    ./scripts/install-packages.sh config/pi-packages.optional.txt

# Compare live ~/.pi/agent/settings.json packages with config/pi-packages.txt
packages-audit:
    uv run python scripts/audit-packages.py

# Dry-run installing shared skills to ~/.agents/skills
shared-skills-dry-run:
    ./scripts/install-shared-skills.sh --dry-run

# Install shared skills to ~/.agents/skills
shared-skills-install:
    ./scripts/install-shared-skills.sh

# Dry-run syncing shared-skills/ from ~/.agents/skills
shared-skills-sync-dry-run:
    ./scripts/sync-shared-skills.sh --dry-run

# Sync shared-skills/ from ~/.agents/skills and regenerate catalog
shared-skills-sync:
    ./scripts/sync-shared-skills.sh
    uv run python scripts/update-catalog.py

# Dry-run symlink install for ~/.pi/agent local config
install-dry-run:
    ./install.sh --dry-run

# Symlink install for ~/.pi/agent local config
install:
    ./install.sh

# Show current repo status plus ignored backup summary
status:
    git status --short --branch
    @echo
    @echo "Ignored backups:"
    @git status --ignored --short .backups || true

# Run the usual pre-push checks, then show status
ready: check packages-audit status
