# Privacy Audit — 2026-04-28

## Scope

Audited tracked files in `pi-config` for personal/local paths, sensitive filenames, credential-like strings, URLs/domains, and unusual tracked files.

## Commands used

```bash
git ls-files | wc -l
git status --short --ignored
git ls-files | grep -Ei '(^|/)(auth|credential|secret|token|password|settings|models|lsp|session|history|intercom|cache|backup|\.env|id_rsa|key)(\.|/|$)|jsonl$'
git grep -n -I -E '(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----|Bearer [A-Za-z0-9._-]{20,}|Authorization: Bearer|password\s*[:=]\s*[^ <`"$]|api[_-]?key\s*[:=]\s*[^ <`"$])'
git grep -n -I -E '(/Users/[A-Za-z0-9._-]+|/home/[A-Za-z0-9._-]+|/var/folders|[A-Za-z0-9._-]+@|homelab|yach|choose-ai|masterblaster)'
git grep -n -I -E '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|https?://[^ )>`"]+)'
git grep -n -I -E 'EveryInc|compound-engineering-plugin|proofeditor|Slack|slack|Linear|linear|GEMINI_API_KEY|ANTHROPIC_API_KEY'
```

## Actions taken

- Removed the personal transition-plan snapshot from `docs/`.
- Changed README intro from owner-specific wording to generic wording.
- Kept `.backups/` ignored; it contains local install backups but is not tracked.
- Removed cross-harness common skills from this repo in a prior commit; those remain in `~/.agents/skills`.

## Findings

### No obvious real secrets found

Credential-like matches are instructional examples or code that reads environment variables, primarily:

- `GEMINI_API_KEY` usage in the Gemini image generation skill.
- placeholder tokens in Proof docs, e.g. `<token>` and `token=xxx`.
- security-demo instructions warning not to leak secrets.

No tracked `auth.json`, `settings.json`, `.env`, session JSONL, run history, or local git mirrors were found.

### Local/personal path matches appear generic

Remaining `/Users/...` and `/var/folders` matches are documentation examples or portability warnings, not this machine's state:

- `/Users/alice/...` example in session historian docs.
- `/Users/name/...` examples in planning docs.
- `/var/folders/...` mention explaining why `/tmp` is preferable for scratch dirs.
- README/inventory self-audit scan commands.

### Items to consciously keep or remove before public sharing

These are not secrets, but they are product/org-specific or require external services:

- `ce-release-notes` and `ce-report-bug` reference `EveryInc/compound-engineering-plugin`.
- `ce-pr-description` includes a Compound Engineering badge URL.
- Slack research agents/skills assume Slack MCP availability and can search private channels using the user's own credentials.
- Proof skills reference `proofeditor.ai`.
- Gemini image generation skill requires `GEMINI_API_KEY` in the user's environment.

For sharing with a trusted friend, these are probably acceptable if documented as optional/opinionated. For public release, consider moving org-specific CE release/reporting skills behind an optional pack or removing them.

## Current assessment

Safe for trusted-friend sharing after a final human skim. For public sharing, do one more curation pass around org-specific CE skills and optional service integrations.
