---
name: project-cockpit
description: Initialize, read, steward, wrap, or resume a lightweight `.project/` cockpit for durable human-agent project continuity. Use when the user asks to initialize project tracking, refresh project state, wrap a session, resume from project state, steward the project cockpit, choose the next chunk, or run Momentum/Advisory/Steward modes. This is user-owned local workflow glue and must not patch CE/vendor-managed skills.
argument-hint: "[init|status|steward|wrap|resume|momentum or natural-language request]"
---

# Project Cockpit

The project cockpit is a small `.project/` directory that helps humans and agents preserve continuity without creating a heavyweight PM system.

This skill is local/user-owned. It must not edit versioned CE or vendor-managed skill files. Cross-cutting ambient behavior belongs in `agent/APPEND_SYSTEM.md`; this skill handles explicit lifecycle operations.

## Files

Required initial cockpit:

```text
.project/
  brief.md
  now.md
  decisions.md
  handoffs/
```

Optional later files such as `roadmap.md` or `backlog.md` are not required. Do not create them unless the user explicitly asks or the current project has clearly outgrown `now.md`.

## Modes

Infer the mode from the user request. If ambiguous, choose the least invasive mode or ask one focused question.

### init

Create an initial cockpit for a project.

1. Check whether `.project/` already exists.
2. If it exists, read `brief.md` and `now.md` if present, then ask before overwriting anything.
3. Create missing files only:
   - `.project/brief.md`
   - `.project/now.md`
   - `.project/decisions.md`
   - `.project/handoffs/.gitkeep`
4. Keep templates generic and concise.
5. Ask only for genuinely missing project-defining information.

### status / resume

Read cockpit state and summarize:

- project north star
- current objective
- active chunk
- validation status
- blockers/open questions
- latest handoff
- next suggested chunks
- stale/conflicting state

Do not mutate files in status/resume mode unless the user asks.

### steward

Maintain cockpit state without doing substantive feature work.

Actions may include:

- reconcile stale `now.md`
- summarize useful handoffs
- remove noise or duplicated stale next chunks
- add missing ready-next-chunk fields
- suggest next chunks
- record durable decisions that were already made

Do not implement product/code changes in Steward mode unless explicitly asked.

### wrap

Close out a meaningful session or chunk.

1. Review what changed in the session.
2. Update `.project/now.md` when state, validation, blockers, or next chunks changed.
3. Append to `.project/decisions.md` only for durable decisions with future consequences.
4. Write `.project/handoffs/YYYY-MM-DD-topic.md` only if context would be expensive to reconstruct.
5. Final response includes:
   - completed chunk
   - validation
   - commit status if applicable
   - recommended next chunk
   - whether the agent can continue now

### momentum

Continue through ready, scoped low/medium-risk next chunks from `.project/now.md` until a stop condition.

Stop when:

- blocked
- validation fails
- scope expands beyond the ready chunk
- risk becomes high
- human approval is needed
- destructive action, secrets, production action, migration, or broad refactor is encountered

## Ready Next Chunk Format

Each next chunk in `.project/now.md` should include:

- Title
- Why it matters
- Expected files/areas
- Max scope
- Dependencies/blockers
- Validation command
- Risk level
- Stop/ask condition
- Human approval needed

## Mutation Rules

- Only the orchestrating session should mutate `.project/`.
- Subagents must not edit cockpit state unless explicitly tasked.
- Prefer useful continuity over completeness.
- Cockpit maintenance should usually take 2–5 minutes.
- Never store secrets, auth tokens, private session dumps, or unrelated personal scratch state in `.project/`.

## Output Style

Be concise. Surface the current state and next action clearly. If you changed files, list them.
