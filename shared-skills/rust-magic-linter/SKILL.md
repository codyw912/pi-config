---
name: rust-magic-linter
description: Add strict Clippy lint configurations to Rust projects for AI-assisted development. Use when the user wants to add Clippy lints, AI guardrails, or rust-magic-linter to a Rust project. Supports three presets (minimal, standard, maximum) that enforce best practices and prevent common AI coding mistakes like using unwrap(), silencing warnings with #[allow()], or leaving debug code.
---

# Rust Magic Linter

Add strict Clippy lint configurations to Rust projects. These "guardrails" help AI agents write better Rust code by turning best practices into compiler errors.

## Workflow

1. Verify this is a Rust project (check for `Cargo.toml`)
2. Ask which preset the user wants (if not specified)
3. Check if `[lints.*]` sections already exist in Cargo.toml
4. Detect workspace vs single project (use `[workspace.lints.*]` for workspaces)
5. Apply the configuration from assets
6. Create `clippy.toml` from assets
7. Optionally offer `.cargo/deny.toml` and `CONSTITUTION.md`
8. Run `cargo clippy` to verify

## Presets

- **minimal** - Just panic guards: `unwrap`, `expect`, `panic`, `allow_attributes`, `dbg_macro`, `todo`. Use for quick safety net with minimal code changes.
- **standard** - Pedantic + async safety + output control. Recommended for most projects.
- **maximum** - All lint groups at deny level, minimal relaxations. Very strict, may require significant code changes.

## Assets

All configuration files are in `assets/`:

- `assets/minimal.toml` - Minimal preset
- `assets/standard.toml` - Standard preset (recommended)
- `assets/maximum.toml` - Maximum preset (strictest)
- `assets/clippy.toml` - Complexity thresholds for project root
- `assets/deny.toml` - cargo-deny config for `.cargo/deny.toml`
- `assets/CONSTITUTION.md` - Project rules template

## Applying Configurations

1. Read the appropriate preset from `assets/`
2. For workspaces: replace `[lints.` with `[workspace.lints.`
3. Append to `Cargo.toml` with a header comment
4. Copy `assets/clippy.toml` to project root
5. If user wants supply chain security: copy `assets/deny.toml` to `.cargo/deny.toml`
6. If user wants project rules: copy `assets/CONSTITUTION.md` to project root

## Key Lints Explained

The most important lint is `allow_attributes = "deny"` - this prevents AI from bypassing errors by adding `#[allow(clippy::...)]`. The AI must actually fix the code.

Other critical lints:
- `unwrap_used`, `expect_used`, `panic` - Force proper error handling
- `dbg_macro`, `todo` - No debug leftovers or incomplete code
- `print_stdout`, `print_stderr` - Use `tracing` for structured logging
- `await_holding_lock` - Prevent async deadlocks

## Repository

https://github.com/vicnaum/rust-magic-linter
