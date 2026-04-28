import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ExtensionAPI, ExtensionCommandContext, Theme } from "@mariozechner/pi-coding-agent";
import { rawKeyHint } from "@mariozechner/pi-coding-agent";
import { Box, Text, matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";

type CouncilHint = {
  runId: string;
  councilOutput: string;
  councillorDir: string;
};

type CouncilRun = {
  runId: string;
  task: string;
  exitCode: number | null;
  durationMs: number | null;
  model: string;
  timestampMs: number;
  councilMeta: string;
  councilInput: string;
  councilOutput: string;
  councillorDir: string;
  councillorOutputs: string[];
};

const SESSIONS_DIR = path.join(process.env.HOME || "", ".pi", "agent", "sessions");

function listCouncilRuns(): CouncilRun[] {
  if (!existsSync(SESSIONS_DIR)) return [];
  const metas: string[] = [];
  walk(SESSIONS_DIR, (file) => {
    if (file.endsWith("_council_meta.json")) metas.push(file);
  });

  const runs: CouncilRun[] = [];
  for (const metaPath of metas) {
    try {
      const raw = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, any>;
      const runId = String(raw.runId || path.basename(metaPath).split("_", 1)[0]);
      const councilDir = path.dirname(metaPath);
      const councilInput = path.join(councilDir, `${runId}_council_input.md`);
      const councilOutput = path.join(councilDir, `${runId}_council_output.md`);
      const councillorDir = typeof raw.councillorDir === "string"
        ? raw.councillorDir
        : path.join(SESSIONS_DIR, "subagent", runId, "run-0", "subagent-artifacts");
      const councillorOutputs = existsSync(councillorDir)
        ? readdirSync(councillorDir)
            .filter((name) => name.endsWith("_output.md"))
            .map((name) => path.join(councillorDir, name))
            .sort()
        : [];
      const timestampMs = safeStatMs(metaPath) ?? Date.now();
      runs.push({
        runId,
        task: String(raw.task || ""),
        exitCode: typeof raw.exitCode === "number" ? raw.exitCode : null,
        durationMs: typeof raw.durationMs === "number" ? raw.durationMs : null,
        model: String(raw.model || ""),
        timestampMs,
        councilMeta: metaPath,
        councilInput,
        councilOutput,
        councillorDir,
        councillorOutputs,
      });
    } catch {
      // ignore malformed run records
    }
  }

  return runs.sort((a, b) => b.timestampMs - a.timestampMs);
}

function walk(dir: string, visit: (file: string) => void) {
  let entries: ReturnType<typeof readdirSync> = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as unknown as ReturnType<typeof readdirSync>;
  } catch {
    return;
  }
  for (const entry of entries as any[]) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

function safeStatMs(file: string): number | null {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`;
}

function formatAge(timestampMs: number): string {
  const diff = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusLabel(exitCode: number | null): string {
  if (exitCode === 0) return "ok";
  if (exitCode === null) return "?";
  return `err:${exitCode}`;
}

function readText(file: string, fallback = ""): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

function readJson(file: string): Record<string, any> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, any>;
  } catch {
    return null;
  }
}

function asyncRunsRoot(): string {
  return path.join(os.tmpdir(), `pi-subagents-uid-${process.getuid?.() ?? "unknown"}`, "async-subagent-runs");
}

function extractCouncilOutput(text: string): string {
  const marker = "# Council Recommendation";
  const index = text.lastIndexOf(marker);
  return (index >= 0 ? text.slice(index) : text).trim();
}

function extractCouncilInput(text: string): string {
  const beforeFirstTool = text.split("subagent: action=list", 1)[0]?.trim() || text.slice(0, 4000).trim();
  return beforeFirstTool.startsWith("Task: ") ? beforeFirstTool.slice("Task: ".length).trim() : beforeFirstTool;
}

function artifactDirForAsyncStatus(status: Record<string, any>): string {
  const sessionFile = typeof status.sessionFile === "string" ? status.sessionFile : "";
  if (sessionFile) return path.join(path.dirname(sessionFile), "subagent-artifacts");
  return path.join(SESSIONS_DIR, "async-council-artifacts");
}

function backfillAsyncCouncilRun(runDir: string): CouncilHint | null {
  const status = readJson(path.join(runDir, "status.json"));
  if (!status || status.state !== "complete") return null;
  const runId = String(status.runId || path.basename(runDir)).slice(0, 8);
  const steps = Array.isArray(status.steps) ? status.steps : [];
  const councilStep = steps.find((step: any) => step?.agent === "council");
  if (!councilStep || councilStep.exitCode !== 0) return null;

  const markerPath = path.join(runDir, ".council-artifact-created");
  if (existsSync(markerPath)) return null;

  const outputFile = typeof status.outputFile === "string" ? status.outputFile : path.join(runDir, "output-0.log");
  const log = readText(outputFile);
  if (!log.trim()) return null;

  const artifactDir = artifactDirForAsyncStatus(status);
  mkdirSync(artifactDir, { recursive: true });
  const councilInput = path.join(artifactDir, `${runId}_council_input.md`);
  const councilOutput = path.join(artifactDir, `${runId}_council_output.md`);
  const councilMeta = path.join(artifactDir, `${runId}_council_meta.json`);
  const councillorDir = path.join(path.dirname(String(status.sessionFile || "")), "subagent-artifacts");

  writeFileSync(councilInput, `${extractCouncilInput(log)}\n`);
  writeFileSync(councilOutput, `${extractCouncilOutput(log)}\n`);
  writeFileSync(councilMeta, `${JSON.stringify({
    runId,
    agent: "council",
    task: extractCouncilInput(log),
    exitCode: 0,
    usage: councilStep.modelAttempts?.find((attempt: any) => attempt?.success)?.usage ?? null,
    model: councilStep.model || "",
    attemptedModels: councilStep.attemptedModels || [],
    modelAttempts: councilStep.modelAttempts || [],
    durationMs: councilStep.durationMs ?? status.endedAt - status.startedAt,
    toolCount: null,
    timestamp: status.endedAt || Date.now(),
    asyncRunId: status.runId,
    asyncRunDir: runDir,
    councillorDir: existsSync(councillorDir) ? councillorDir : undefined,
  }, null, 2)}\n`);
  writeFileSync(markerPath, new Date().toISOString());
  return { runId, councilOutput, councillorDir };
}

function summaryExcerpt(text: string): string[] {
  const cleaned = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, 32);
  return cleaned.length ? cleaned : ["(no council summary output found)"];
}

function resolveRun(arg: string | undefined): CouncilRun | null {
  const runs = listCouncilRuns();
  if (runs.length === 0) return null;
  if (!arg || arg.trim() === "" || arg.trim() === "latest") return runs[0]!;
  const wanted = arg.trim();
  return runs.find((r) => r.runId === wanted) ?? runs.find((r) => r.runId.startsWith(wanted)) ?? null;
}

async function openRunInNvim(ctx: ExtensionCommandContext, run: CouncilRun): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("/council-open requires the interactive TUI", "warning");
    return;
  }

  const files = [run.councilOutput, ...run.councillorOutputs].filter((f) => existsSync(f));
  if (files.length === 0) {
    ctx.ui.notify(`No council review files found for ${run.runId}`, "warning");
    return;
  }

  const nvim = process.env.NVIM || "nvim";
  await ctx.ui.custom<number | null>((tui, _theme, _kb, done) => {
    tui.stop();
    process.stdout.write("\x1b[2J\x1b[H");
    const result = spawnSync(nvim, ["-p", "-R", ...files], {
      stdio: "inherit",
      env: process.env,
    });
    tui.start();
    tui.requestRender(true);
    done(result.status ?? 1);
    return { render: () => [], invalidate: () => {} };
  });
}

class CouncilRunsOverlay {
  private selected = 0;
  private readonly bodyRows = 26;

  constructor(
    private readonly theme: Theme,
    private readonly runs: CouncilRun[],
    private readonly done: (value: { action: "open" | "close"; run?: CouncilRun }) => void,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "q")) {
      this.done({ action: "close" });
      return;
    }
    if (matchesKey(data, "up") || matchesKey(data, "k")) {
      this.selected = Math.max(0, this.selected - 1);
      return;
    }
    if (matchesKey(data, "down") || matchesKey(data, "j")) {
      this.selected = Math.min(this.runs.length - 1, this.selected + 1);
      return;
    }
    if (matchesKey(data, "return") || matchesKey(data, "o")) {
      this.done({ action: "open", run: this.runs[this.selected] });
    }
  }

  render(width: number): string[] {
    const w = Math.max(80, width);
    const inner = w - 2;
    const leftW = Math.max(28, Math.min(42, Math.floor(inner * 0.34)));
    const rightW = inner - leftW - 1;
    const lines: string[] = [];

    const current = this.runs[this.selected];
    const preview = current ? this.buildPreview(current, rightW) : [this.theme.fg("muted", "No council runs found")];
    const list = this.buildList(leftW);
    const rows = this.bodyRows;

    lines.push(this.theme.fg("border", `╭${"─".repeat(inner)}╮`));
    lines.push(this.borderRow(`${this.theme.fg("accent", this.theme.bold(" Council Runs "))}${this.theme.fg("dim", "Enter/o open in nvim • ↑↓ navigate • Esc close")}`, inner));
    lines.push(this.theme.fg("border", `├${"─".repeat(leftW)}┬${"─".repeat(rightW)}┤`));

    for (let i = 0; i < rows; i++) {
      const left = padAnsi(list[i] ?? "", leftW);
      const right = padAnsi(preview[i] ?? "", rightW);
      lines.push(`${this.theme.fg("border", "│")}${left}${this.theme.fg("border", "│")}${right}${this.theme.fg("border", "│")}`);
    }

    lines.push(this.theme.fg("border", `╰${"─".repeat(inner)}╯`));
    return lines;
  }

  invalidate(): void {}

  private buildList(width: number): string[] {
    const lines: string[] = [];
    lines.push(this.theme.fg("muted", truncateToWidth("Recent runs", width)));
    lines.push("");
    if (this.runs.length === 0) {
      lines.push(this.theme.fg("warning", truncateToWidth("No council runs found", width)));
      return lines;
    }

    const maxItems = 14;
    const start = Math.max(0, Math.min(this.selected - Math.floor(maxItems / 2), Math.max(0, this.runs.length - maxItems)));
    const end = Math.min(this.runs.length, start + maxItems);

    for (let i = start; i < end; i++) {
      const run = this.runs[i]!;
      const selected = i === this.selected;
      const prefix = selected ? this.theme.fg("accent", "› ") : this.theme.fg("dim", "  ");
      const body = `${run.runId}  ${statusLabel(run.exitCode)}  ${formatDuration(run.durationMs)}`;
      const line1 = truncateToWidth(prefix + (selected ? this.theme.fg("accent", body) : body), width);
      const sub = `${formatAge(run.timestampMs)}  ${run.model || "unknown model"}`;
      const line2 = truncateToWidth(`${selected ? this.theme.fg("accent", "  ") : "  "}${this.theme.fg("dim", sub)}`, width);
      lines.push(line1, line2, "");
    }
    return lines.slice(0, this.bodyRows);
  }

  private buildPreview(run: CouncilRun, width: number): string[] {
    const lines: string[] = [];
    const title = `${run.runId}  ${statusLabel(run.exitCode)}  ${formatDuration(run.durationMs)}  ${formatAge(run.timestampMs)}`;
    lines.push(this.theme.fg("accent", truncateToWidth(title, width)));
    if (run.model) lines.push(this.theme.fg("dim", truncateToWidth(run.model, width)));
    lines.push("");
    lines.push(this.theme.fg("muted", truncateToWidth("Task", width)));
    lines.push(...wrapToWidth(run.task || "(no task recorded)", width));
    lines.push("");
    lines.push(this.theme.fg("muted", truncateToWidth("Summary preview", width)));
    for (const line of summaryExcerpt(readText(run.councilOutput))) {
      lines.push(...wrapToWidth(line, width));
    }
    lines.push("");
    lines.push(this.theme.fg("muted", truncateToWidth("Files", width)));
    lines.push(...wrapToWidth(path.basename(run.councilOutput), width));
    for (const out of run.councillorOutputs) {
      lines.push(...wrapToWidth(path.basename(out), width));
    }
    return lines.slice(0, this.bodyRows);
  }

  private borderRow(content: string, width: number): string {
    return `${this.theme.fg("border", "│")}${padAnsi(content, width)}${this.theme.fg("border", "│")}`;
  }
}

function wrapToWidth(text: string, width: number): string[] {
  const clean = text || "";
  return wrapTextWithAnsi(clean, width).slice(0, 18);
}

function padAnsi(text: string, width: number): string {
  const truncated = truncateToWidth(text, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

export default function councilTools(pi: ExtensionAPI) {
  const pendingHints: CouncilHint[] = [];

  pi.registerMessageRenderer("council-review-hint", (message, { expanded }, theme) => {
    const details = (message.details ?? {}) as Partial<CouncilHint>;
    const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
    let text = `${theme.fg("accent", theme.bold("Council review available"))}  ${theme.fg("dim", rawKeyHint("alt+o", "to browse"))} ${theme.fg("dim", "or /council-runs")}`;
    if (details.runId) {
      text += `\n${theme.fg("muted", `run ${details.runId}`)}`;
    }
    if (expanded) {
      if (details.councilOutput) text += `\n${theme.fg("dim", `summary: ${details.councilOutput}`)}`;
      if (details.councillorDir) text += `\n${theme.fg("dim", `raw outputs: ${details.councillorDir}`)}`;
    }
    box.addChild(new Text(text, 0, 0));
    return box;
  });

  pi.on("tool_result", async (event, _ctx) => {
    if (event.toolName !== "subagent") return;
    const input = (event.input ?? {}) as Record<string, any>;
    const details = (event.details ?? {}) as Record<string, any>;
    const results = Array.isArray(details.results) ? details.results : [];
    const councilResult = results.find((r: any) => r && r.agent === "council");
    const explicitlyCouncil = input.agent === "council";
    if (!explicitlyCouncil && !councilResult) return;
    if (!councilResult || typeof councilResult !== "object") return;
    if (typeof councilResult.exitCode === "number" && councilResult.exitCode !== 0) return;
    const artifactPaths = (councilResult.artifactPaths ?? {}) as Record<string, any>;
    const metadataPath = typeof artifactPaths.metadataPath === "string" ? artifactPaths.metadataPath : "";
    const outputPath = typeof artifactPaths.outputPath === "string" ? artifactPaths.outputPath : "";
    if (!metadataPath || !outputPath) return;
    const base = path.basename(metadataPath);
    const runId = base.split("_", 1)[0] || details.runId || input.id || "";
    if (!runId) return;
    const councillorDir = path.join(SESSIONS_DIR, "subagent", runId, "run-0", "subagent-artifacts");
    pendingHints.push({ runId, councilOutput: outputPath, councillorDir });
  });

  function sendCouncilHint(hint: CouncilHint) {
    pi.sendMessage({
      customType: "council-review-hint",
      content: `Council review available for ${hint.runId}`,
      display: true,
      details: hint,
    });
  }

  function flushPendingHints() {
    if (pendingHints.length === 0) return;
    for (const hint of pendingHints.splice(0)) sendCouncilHint(hint);
  }

  function scanAsyncCouncilRuns() {
    const root = asyncRunsRoot();
    if (!existsSync(root)) return;
    for (const name of readdirSync(root)) {
      const runDir = path.join(root, name);
      if (!statSync(runDir).isDirectory()) continue;
      const hint = backfillAsyncCouncilRun(runDir);
      if (hint) sendCouncilHint(hint);
    }
  }

  pi.on("agent_end", async () => {
    flushPendingHints();
    scanAsyncCouncilRuns();
  });

  const asyncScanTimer = setInterval(scanAsyncCouncilRuns, 15_000);
  asyncScanTimer.unref?.();
  const completions = (prefix: string) => {
    const values = ["latest", ...listCouncilRuns().slice(0, 20).map((r) => r.runId)];
    const filtered = values.filter((v) => v.startsWith(prefix));
    return filtered.length ? filtered.map((v) => ({ value: v, label: v })) : null;
  };

  const showCouncilRuns = async (ctx: ExtensionCommandContext) => {
    const runs = listCouncilRuns();
    if (runs.length === 0) {
      ctx.ui.notify("No council runs found", "info");
      return;
    }
    const result = await ctx.ui.custom<{ action: "open" | "close"; run?: CouncilRun }>(
      (_tui, theme, _kb, done) => new CouncilRunsOverlay(theme, runs, done),
      {
        overlay: true,
        overlayOptions: {
          anchor: "center",
          width: "88%",
          maxHeight: "80%",
          minWidth: 96,
          margin: 1,
        },
      },
    );
    if (result?.action === "open" && result.run) {
      await openRunInNvim(ctx, result.run);
    }
  };

  pi.registerCommand("council-open", {
    description: "Open a council review in Neovim tabs",
    getArgumentCompletions: completions,
    handler: async (args, ctx) => {
      const run = resolveRun(args);
      if (!run) {
        ctx.ui.notify("No matching council run found", "warning");
        return;
      }
      await openRunInNvim(ctx, run);
    },
  });

  pi.registerCommand("council-runs", {
    description: "Browse recent council runs in an overlay",
    handler: async (_args, ctx) => {
      await showCouncilRuns(ctx);
    },
  });

  pi.registerShortcut("alt+o", {
    description: "Open council runs overlay",
    handler: async (ctx) => {
      await showCouncilRuns(ctx);
    },
  });
}
