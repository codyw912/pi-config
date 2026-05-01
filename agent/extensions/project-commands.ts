import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

type CommandSpec = {
  name: string;
  description: string;
  prompt: (args: string) => string;
};

const commands: CommandSpec[] = [
  {
    name: "project-init",
    description: "Bootstrap or repair .project cockpit structure",
    prompt: (args) => withArgs(
      "Use the project-cockpit skill in init mode. Bootstrap or repair the .project cockpit structure for this repo. If .project already exists, read existing brief.md and now.md if present, preserve existing content, create only missing required files/directories, and ask before overwriting or restructuring anything. Required initial structure is .project/brief.md, .project/now.md, .project/decisions.md, and .project/handoffs/.gitkeep. Do not create roadmap.md or phases/ unless I explicitly ask or the project clearly needs planning structure now.",
      args,
    ),
  },
  {
    name: "project-status",
    description: "Summarize .project cockpit state",
    prompt: (args) => withArgs(
      "Use the project-cockpit skill in status/resume mode. Read .project/brief.md and .project/now.md if present, then summarize north star, current objective, active chunk, validation, blockers, stale state, and next suggested chunks. Do not mutate files unless I explicitly ask.",
      args,
    ),
  },
  {
    name: "project-roadmap",
    description: "Create or revise .project/roadmap.md",
    prompt: (args) => withArgs(
      "Use the project-planning skill in roadmap mode. Create or revise .project/roadmap.md from the project brief/current state. Clarify only project-defining unknowns, one focused question at a time. Keep phases outcome-oriented and update .project/now.md only if active planning state or next suggested planning chunks change.",
      args,
    ),
  },
  {
    name: "project-deepen",
    description: "Deepen one roadmap phase into .project/phases/NN-name.md",
    prompt: (args) => withArgs(
      "Use the project-planning skill in deepen-phase mode. Deepen the requested roadmap phase into a phase plan under .project/phases/. Include goal, dependencies, expected end-state, workstreams, decisions, risks, validation strategy, acceptance criteria, candidate chunks, and non-goals. Use subagents/council only if risk or trade-offs justify it.",
      args,
    ),
  },
  {
    name: "project-chunk",
    description: "Convert a phase plan into ready .project/now.md chunks",
    prompt: (args) => withArgs(
      "Use the project-planning skill in chunk-phase mode. Convert the requested phase plan into ready chunks for .project/now.md. Each chunk must include title, why, expected files/areas, max scope, dependencies/blockers, validation command, risk, stop/ask condition, and whether human approval is needed. Put only the next few ready chunks in now.md; keep later candidates in the phase plan.",
      args,
    ),
  },
  {
    name: "project-wrap",
    description: "Wrap current session/chunk and update cockpit",
    prompt: (args) => withArgs(
      "Use the project-cockpit skill in wrap mode. Review what changed, validate if appropriate, update .project/now.md/decisions/handoffs as needed, and commit a completed validated implementation chunk unless a valid no-commit condition applies. Final response should include completed chunk, validation, commit status, recommended next chunk, and whether you can continue now.",
      args,
    ),
  },
  {
    name: "project-momentum",
    description: "Continue ready cockpit chunks until a stop condition",
    prompt: (args) => withArgs(
      "Use the project-cockpit skill in momentum mode. Continue through ready, scoped low/medium-risk next chunks from .project/now.md until blocked, validation fails, scope expands, risk becomes high, approval is needed, or a destructive/secret/production/migration action is encountered. Commit validated implementation chunks at chunk boundaries unless a valid no-commit condition applies.",
      args,
    ),
  },
  {
    name: "project-review-roadmap",
    description: "Review roadmap or phase plans for gaps",
    prompt: (args) => withArgs(
      "Use the project-planning skill in review-roadmap mode. Review the existing roadmap and phase plans for unclear success criteria, phase ordering problems, hidden dependencies, missing validation, architectural coupling, migration risk, oversized chunks, stale decisions, and conflicts with .project/decisions.md. Return concise findings and recommended edits; mutate files only if I ask or the request clearly implies stewarding the plan.",
      args,
    ),
  },
];

function withArgs(base: string, args: string): string {
  const trimmed = args.trim();
  if (!trimmed) return base;
  return `${base}\n\nAdditional user instructions: ${trimmed}`;
}

function runPrompt(pi: ExtensionAPI, ctx: ExtensionCommandContext, prompt: string) {
  if (!ctx.isIdle()) {
    pi.sendUserMessage(prompt, { deliverAs: "followUp" });
    ctx.ui.notify("Project command queued as follow-up", "info");
    return;
  }
  pi.sendUserMessage(prompt);
}

function helpText(): string {
  return [
    "Project commands:",
    "  /project-init — bootstrap or repair .project cockpit structure",
    "  /project-status — summarize .project cockpit state",
    "  /project-roadmap [topic] — create/revise long-term roadmap",
    "  /project-deepen <phase> — deepen a roadmap phase",
    "  /project-chunk <phase> — convert phase plan to ready chunks",
    "  /project-review-roadmap — review roadmap/phase plans for gaps",
    "  /project-wrap — wrap session/chunk, update cockpit, commit if appropriate",
    "  /project-momentum — execute ready chunks until stop condition",
  ].join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("project-help", {
    description: "Show project planning/cockpit commands",
    handler: async (_args, ctx) => ctx.ui.notify(helpText(), "info"),
  });

  for (const spec of commands) {
    pi.registerCommand(spec.name, {
      description: spec.description,
      handler: async (args, ctx) => runPrompt(pi, ctx, spec.prompt(args)),
    });
  }
}
