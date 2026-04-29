---
name: project-planning
description: Create and deepen long-term project roadmaps that integrate with `.project/` cockpit. Use when the user wants architecture/product roadmap planning, phase planning, plan deepening, breaking a long-term project into phases, or converting a phase into ready implementation chunks. Generic enough for software, writing, research, business, and learning projects; optimized for software architecture/product roadmaps.
argument-hint: "[roadmap|deepen-phase|chunk-phase|review-roadmap or natural-language planning request]"
---

# Project Planning

Long-horizon planning layer for projects that have outgrown a single `.project/now.md` next-chunk list.

This skill complements `project-cockpit`:

- `project-planning` creates/maintains roadmap and phase plans.
- `project-cockpit` remains the operational control panel for current work, wrap, steward, resume, and momentum execution.

Keep plans useful, not bureaucratic. Prefer enough structure to guide future agents over exhaustive project management.

## Planning Ladder

```text
.project/brief.md
  → .project/roadmap.md
    → .project/phases/NN-phase-name.md
      → ready chunks in .project/now.md
        → session work / momentum
```

## Files

Use optional files only when needed:

```text
.project/
  brief.md              # stable north star / constraints
  now.md                # operational control panel
  roadmap.md            # long-term architecture/product/project roadmap
  phases/
    01-foundation.md
    02-core-workflow.md
  decisions.md
  handoffs/
```

Do not create `roadmap.md` or `phases/` for tiny projects unless the user asks.

## Modes

Infer mode from the user request. If ambiguous, choose the least invasive planning mode or ask one focused question.

### roadmap

Create or revise `.project/roadmap.md`.

1. Read `.project/brief.md`, `.project/now.md`, existing roadmap/phase files, and relevant docs/code if present.
2. Clarify only project-defining unknowns. Ask one focused question at a time.
3. Draft a roadmap with:
   - objective / north star
   - current state
   - target architecture or end-state
   - guiding constraints and non-goals
   - phase sequence
   - cross-phase risks
   - validation / success measures
   - open questions
4. For software projects, include architecture boundaries, data/control flow, migration strategy, testing/validation, and operational concerns when relevant.
5. Keep phases outcome-oriented, not task dumps.
6. Update `.project/now.md` only if the active planning state or next suggested planning chunk changes.

### deepen-phase

Expand one roadmap phase into `.project/phases/NN-name.md`.

A phase plan should include:

- phase goal and why it matters
- entry criteria / dependencies
- expected architecture or project shape after the phase
- major workstreams
- key decisions needed
- risks and unknowns
- validation strategy
- acceptance criteria
- candidate chunks, still rough
- explicit non-goals

Use subagents/council when the phase is high-risk, architectural, or has meaningful trade-offs. Ask reviewers for missing risks, sequencing problems, validation gaps, and scope creep. Keep their output compressed into the phase plan; do not paste long transcripts.

### chunk-phase

Convert a phase plan into ready chunks suitable for `.project/now.md`.

Each ready chunk must include:

- Title
- Why it matters
- Expected files/areas
- Max scope
- Dependencies/blockers
- Validation command
- Risk level
- Stop/ask condition
- Human approval needed

Chunking rules:

- Prefer chunks that can be completed and validated in one focused session.
- Keep migrations, destructive operations, auth/secrets, and production actions as explicit approval-gated chunks.
- Avoid mixing exploration, implementation, and broad cleanup in one chunk.
- If a chunk is too large, split by boundary, workflow, or validation target.
- Put only the next few ready chunks in `.project/now.md`; keep later candidates in the phase plan.

### review-roadmap

Review an existing roadmap or phase plan.

Look for:

- unclear north star or success criteria
- phase order problems
- hidden dependencies
- missing validation
- architectural coupling or migration risk
- chunks that are too large or vague
- stale decisions or conflicts with `.project/decisions.md`

Return concise findings and recommended edits. Mutate files only if the user asks or the mode clearly implies stewarding the plan.

## Generic Project Support

For non-software projects, map the same structure to the domain:

- architecture → project structure / operating model
- implementation chunks → deliverables / work sessions
- validation command → review method / checklist / measurable outcome
- tests → acceptance criteria / quality bar
- migration → transition plan

Do not force software terminology where it does not fit.

## Cockpit Integration

- Treat `.project/brief.md` as the north star.
- Treat `.project/now.md` as the current execution panel, not a full backlog.
- Record durable choices in `.project/decisions.md` only when they constrain future work.
- When planning changes the active next work, update `.project/now.md` with the next ready planning or implementation chunks.
- Do not modify `.project/` from subagents unless explicitly instructed.

## Output Style

- Lead with the planning artifact changed or proposed.
- Distinguish roadmap phases from executable chunks.
- Call out assumptions, risks, and open questions.
- Keep plans scannable for future agents.
