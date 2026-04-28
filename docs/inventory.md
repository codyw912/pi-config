# Shareable Pi Config Inventory

Created: 2026-04-28

## Included in this repo

| Path | Source | Notes |
| --- | --- | --- |
| `agent/AGENTS.md` | `~/.pi/agent/AGENTS.md` | Pi/CE compatibility instructions. |
| `agent/APPEND_SYSTEM.md` | `~/.pi/agent/APPEND_SYSTEM.md` | Global appended system prompt / operating guidance. |
| `agent/agents/` | `~/.pi/agent/agents/` | Custom agent definitions, including council. |
| `agent/skills/` | `~/.pi/agent/skills/` | Pi/CE-specific curated skills. Cross-harness common skills remain in `~/.agents/skills` and are not vendored here. |
| `agent/extensions/` | `~/.pi/agent/extensions/` | Custom Pi extensions, including council tools. |

Approximate copied size at initial transition: ~2.4 MB across ~213 files before removing cross-harness common skills that belong in `~/.agents/skills`.

## Explicitly excluded

These are intentionally not copied and should not be committed:

- `~/.pi/agent/auth.json`
- `~/.pi/agent/settings.json`, `models.json`, `lsp.json`, `.pi-lsp.json`
- `~/.pi/agent/sessions/`
- `~/.pi/agent/git/`
- `~/.pi/agent/.cache/`, `bench-reports/`, `intercom/`
- `~/.pi/agent/run-history.jsonl`
- root scratch files such as `IDEAS.md`, `progress.md`, `task_plan.md`

## Initial scan notes

Secret-ish scan of included files produced instructional/example matches only; no obvious real credentials were found. Local path scan found generic documentation examples and README scan commands, not live private state.

Before pushing publicly or sharing broadly, rerun:

```bash
grep -RInE '(api[_-]?key|secret|token|password|bearer|sk-[A-Za-z0-9]|AIza)' agent README.md install.sh || true
grep -RInE '/Users/[^[:space:]]+|/var/folders' agent README.md install.sh docs || true
```

Review all matches manually.
