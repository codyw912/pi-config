# Pi Package Dependencies

This repo does not vendor Pi package git clones from `~/.pi/agent/git/`. That directory is Pi's package install/cache area and may contain nested `.git` directories, `node_modules`, lockfiles, and stale experiments.

Instead, package dependencies are tracked as source refs in `config/` and installed with `scripts/install-packages.sh`.

## Install default package set

```bash
./scripts/install-packages.sh --dry-run
./scripts/install-packages.sh
```

## Default packages

These are part of the normal stack and are listed in `config/pi-packages.txt`.

| Package ref | Source / docs | Purpose |
| --- | --- | --- |
| `npm:pi-web-access` | npm package | Web/search/fetch tooling and related skills. |
| `npm:pi-subagents` | npm package | Subagent orchestration: single, parallel, chains, async, council execution substrate. |
| `npm:pi-ask-user` | npm package | Structured blocking user questions via `ask_user`. |
| `npm:@yofriadi/pi-lsp` | npm package | LSP integration. |
| `npm:@ujjwalgrover/pi-catppuccin` | npm package | Catppuccin themes. |
| `npm:pi-intercom` | npm package | Local session-to-session coordination. |
| `npm:@ff-labs/pi-fff` | npm package | Fast file finding / grep tools. |
| `git:github.com/IgorWarzocha/pi-auto-reasoning-tool` | <https://github.com/IgorWarzocha/pi-auto-reasoning-tool> | Auto-reasoning Pi extension. |

## Optional / discovered packages

These packages were found in the local Pi git cache but are not part of the default stack. They are tracked in `config/pi-packages.optional.txt` so they are easy to inspect or install intentionally.

Install optional package refs explicitly:

```bash
./scripts/install-packages.sh config/pi-packages.optional.txt
```

| Package ref | Source / docs | Notes |
| --- | --- | --- |
| `git:github.com/davebcn87/pi-autoresearch` | <https://github.com/davebcn87/pi-autoresearch> | Autoresearch package discovered in local git cache. Review before enabling. |
| `git:github.com/samfoy/pi-lsp-extension` | <https://github.com/samfoy/pi-lsp-extension> | Alternate/experimental LSP extension discovered in local git cache. Review before enabling, especially because the default stack already includes `npm:@yofriadi/pi-lsp`. |

## Adding a package

1. Install and test it locally with `pi install <source-ref>`.
2. Add the source ref to `config/pi-packages.txt` if it should be part of the default stack, or `config/pi-packages.optional.txt` if it is optional.
3. Add a row above with a source link and purpose.
4. Do not commit `~/.pi/agent/git/...` clones.

## Removing a package

1. Remove it from the relevant `config/pi-packages*.txt` file.
2. Remove or update the table row above.
3. Optionally run `pi remove <source-ref>` locally.
