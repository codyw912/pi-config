# CE Patterns Worth Borrowing

This repo intentionally does not install or vendor the full Compound Engineering plugin surface. CE remains useful as an idea library: borrow compact patterns that improve local workflow, without reintroducing dozens of always-visible agents/skills.

## Borrowing principles

- Prefer small local skills, prompt snippets, or council modes over full CE installs.
- Keep model-visible surface area low; add only concepts that are repeatedly useful.
- Preserve generic workflows, not vendor/project-specific implementation details.
- Use prompt-audit measurements after adding anything ambient.
- Do not patch or fork CE-managed files; if CE is needed, reinstall upstream or copy a clearly attributed, minimal local derivative.

## High-value patterns

### 1. Focused review personas

CE's broad reviewer catalog suggests a useful minimal set of local review lenses:

- correctness / reliability
- security / privacy
- scope / simplicity
- performance / scalability
- maintainability / project standards

Possible local form: a small `code-review` skill or council mode that fans out to 4-6 focused reviewers, then dedupes and confidence-gates findings.

Avoid recreating the full reviewer zoo unless a stack or domain repeatedly needs it.

### 2. Structured review pipeline

The strongest CE review idea is the pipeline shape:

1. determine diff/scope
2. run focused reviewers
3. merge and dedupe findings
4. confidence-gate low-signal comments
5. present actionable findings with file/line evidence and suggested fixes

Possible local form: a lightweight review skill that uses existing `subagent`/`council` infrastructure and produces compact findings only.

### 3. Plan deepening

CE's planning flow separates initial plan creation from a later adversarial/deepening pass.

Useful local pattern:

- draft plan
- ask targeted subagents/council to find missing risks, sequencing issues, validation gaps, and scope creep
- revise into ready chunks
- record durable next chunks in `.project/now.md`

This fits naturally with the project cockpit.

### 4. Debug discipline

CE's debug concept is worth keeping as a compact workflow:

- reproduce before changing code
- collect concrete evidence
- trace from symptom to boundary
- make one hypothesis-driven change at a time
- record failed attempts when they matter
- validate the fix against the original symptom

Possible local form: a `debug` skill or concise `APPEND_SYSTEM.md` addition if prompt-audit says ambient cost is acceptable.

### 5. Shipping / PR polish

Useful CE shipping ideas:

- value-first commit and PR descriptions
- explicit validation evidence
- screenshots/GIFs for UI changes
- before/after notes when behavior changes
- clear reviewer guidance and risk notes

Possible local form: a small `ship` or `pr-description` skill. Keep it optional/invoked, not always-on.

### 6. Session learnings, but via cockpit

CE's session-history and learning-capture ideas overlap with `.project` cockpit goals.

Prefer improving cockpit discipline instead of adding broad session scraping:

- update `now.md` when state changes
- append durable decisions only when future-facing
- write handoffs only when context is expensive to reconstruct
- keep validation and commit status obvious

### 7. Metric-driven optimization

CE's optimization loop is useful for measurable goals:

- search relevance
- clustering quality
- prompt quality
- build/test performance
- ranking/scoring heuristics

Possible local form: a recipe document or invoked skill for experiment loops. Avoid ambient installation unless used often.

## Concepts to avoid for now

- Slack, Proof, Gemini imagegen, Xcode, or other integration-specific skills unless actively needed.
- Full autonomous `lfg` / `ce-work` style workflows; too broad and token-heavy for this profile.
- CE setup, release-notes, and bug-report skills; they are plugin-maintenance specific.
- Large framework/persona catalogs unless tied to recurring work in this config.
- Vendored CE snapshots that make this repo feel like a fork of CE.

## Candidate next implementations

### A. Lightweight code-review skill + small reviewer set

Why: likely highest day-to-day value.

Possible files:

- `agent/skills/code-review/SKILL.md`
- optional `agent/agents/reviewer-correctness.md`
- optional `agent/agents/reviewer-security.md`
- optional `agent/agents/reviewer-simplicity.md`
- optional `agent/agents/reviewer-performance.md`

Validation:

- run `just check`
- run `/prompt-audit-save` before/after if agents are model-visible
- test on a real diff and inspect false-positive rate

Stop/ask condition: if the design starts recreating CE's full reviewer system.

### B. Debug skill

Why: compact, general, low surface area.

Possible file:

- `agent/skills/debug/SKILL.md`

Validation:

- run `just check`
- use on a real failing test or bug investigation

Stop/ask condition: if it grows into a large framework with many scripts.

### C. Shipping / PR description skill

Why: useful after implementation chunks, especially with cockpit commit-boundary workflow.

Possible file:

- `agent/skills/ship/SKILL.md` or `agent/skills/pr-description/SKILL.md`

Validation:

- run `just check`
- compare generated PR description quality on recent commits

Stop/ask condition: if it depends on GitHub-specific automation that should remain optional.
