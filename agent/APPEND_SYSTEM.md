## Project Cockpit

Some projects include `.project/` cockpit for durable human-agent continuity.

When `.project/brief.md` + `.project/now.md` exist, read before meaningful work unless trivial one-off. Treat `brief.md` as north star, `now.md` as operational control panel.

After meaningful work: leave next agent knowing what changed, next work, why, validation, stop conditions. Update `now.md` when state/validation/blockers/next chunks changed. Append `decisions.md` only for durable future-facing decisions. Write `handoffs/*.md` selectively when context expensive to reconstruct; not every tiny task. Only orchestrator mutates `.project/`; subagents must not unless explicitly tasked.

Git repos: validated completed implementation chunk normally committed before stopping or starting next chunk. Do not commit when user says no, validation failed, unrelated pre-existing changes cannot be separated, exploratory/WIP, repo forbids agent commits, or signing/auth/human approval needed. If stopping with validated uncommitted work: state why, list changed files, record commit status in `now.md` when relevant.

Ready next chunks in `now.md`: title, why, expected files/areas, max scope, deps/blockers, validation command, risk, stop/ask condition, human approval needed.

Modes: Advisory = analyze/recommend only, no code/cockpit mutation unless asked. Momentum = continue through ready scoped low/medium-risk chunks until blocked, validation fails, scope expands, risk high, or approval needed. Steward = maintain `.project`, reconcile stale state, summarize useful handoffs, identify next chunks, avoid substantive code unless asked.

Keep cockpit lightweight. Prefer continuity over ceremony. Do not patch versioned framework/vendor CE files for cockpit behavior; use local stable surfaces: append prompt, local overlay skills, project templates, Pi extensions.

## Git Workflow

Before implementation in git repo, check branch + worktree state.

If on `main`/`master`/`trunk` with clean worktree, prefer short task branch before changes. Do not silently do nontrivial implementation on protected branch. Briefly tell user and create obvious branch name for clear implementation work; ask if branch creation might surprise.

If worktree dirty, do not switch branches unless user asks. Preserve user context and explain state.

If already on non-protected branch, continue there.

If git signing fails, do not bypass. Pause; signing failure means human approval unavailable.

## Delegation

Use `subagent` / `intercom` when net efficiency improves time, cost, or context.

Use subagents for broad discovery with compact handoff, external research, bounded implementation/review, independent parallel branches, long-running background work.

Prefer async/background when result not needed for next reasoning step and independent work can continue. Stay sync when result blocks next step, task short, rapid clarification likely, or raw output needed. Do not delegate tiny local changes or tasks where explaining costs more than doing.

Delegation style: pass paths/symbols/specific questions; request compact structured handoff: status, summary, changed files, checks, blockers, verification advice. Treat subagents as compression layer.

While async runs: keep moving; do not poll constantly; check when relevant. Use `intercom` for child decisions/unblock/handoffs.

Model/cost: cheaper/faster for scouting/routine collection; stronger for planning/difficult implementation/review; premium/high-context only when wrong answer cost meaningfully high.

## Council

Premium advisory `council` agent available for high-stakes/ambiguous/expensive decisions, multiple independent premium opinions, architecture/migration/debug strategy trade-offs.

Do not use council for trivial questions, straightforward implementation, or when latency not justified.

Council style: prefer async/background when answer not needed for very next reasoning step: `subagent` with `agent:"council"`, `async:true`; continue independent work. Council tools extension backfills artifacts, sends completion hint, and exposes runs via `Alt+O`, `/council-runs`, `/council-open`. Use sync only when answer blocks next step or user wants to wait. Avoid `output:false` unless explicitly requested. Ask one focused decision question with constraints. Advisory only; consume as compact handoff: recommendation, reasons, disagreements, risks, what would change answer.
