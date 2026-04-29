import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { getEncoding } from "js-tiktoken";

type AuditItem = {
  label: string;
  category: string;
  tokens: number;
  chars: number;
  source?: string;
  action?: string;
};

type AuditSnapshot = {
  capturedAt: string;
  prompt?: string;
  model?: string;
  tokenizer: string;
  totals: {
    systemPromptTokens?: number;
    providerPayloadTokens?: number;
    providerSystemTokens?: number;
    providerMessageTokens?: number;
    providerToolTokens?: number;
  };
  items: AuditItem[];
  provider?: {
    payloadKeys: string[];
    toolCount: number;
    messageCount: number;
  };
};

const enc = getEncoding("cl100k_base");
let latest: AuditSnapshot | null = null;
let lastSystemPrompt = "";
let lastPrompt = "";
let lastOptions: any = null;

function countTokens(value: unknown): number {
  const text = typeof value === "string" ? value : stableStringify(value);
  if (!text) return 0;
  return enc.encode(text).length;
}

function charCount(value: unknown): number {
  const text = typeof value === "string" ? value : stableStringify(value);
  return text.length;
}

function stableStringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === "function") return `[Function ${val.name || "anonymous"}]`;
      return val;
    }, 2);
  } catch {
    return String(value);
  }
}

function addItem(items: AuditItem[], category: string, label: string, value: unknown, source?: string, action?: string) {
  const tokens = countTokens(value);
  if (tokens === 0) return;
  items.push({ category, label, tokens, chars: charCount(value), source, action });
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function itemPath(item: any): string | undefined {
  return item?.path || item?.location || item?.file || item?.source || item?.skill?.location;
}

function itemName(item: any, fallback: string): string {
  return String(item?.name || item?.title || item?.id || item?.skill?.name || fallback);
}

function buildSystemItems(systemPrompt: string, options: any): AuditItem[] {
  const items: AuditItem[] = [];
  addItem(items, "system", "full chained system prompt", systemPrompt, undefined, "inspect components below before editing");
  if (!options || typeof options !== "object") return items;

  addItem(items, "system/custom", "customPrompt", options.customPrompt, undefined, "shorten if locally owned");
  addItem(items, "system/append", "appendSystemPrompt", options.appendSystemPrompt, "APPEND_SYSTEM / append flags", "shorten if locally owned");

  for (const [i, file] of asArray(options.contextFiles).entries()) {
    const label = itemName(file, `context file ${i + 1}`);
    addItem(items, "system/context-file", label, file?.content ?? file, itemPath(file), "shorten or split if always loaded");
  }

  for (const [i, skill] of asArray(options.skills).entries()) {
    const name = itemName(skill, `skill ${i + 1}`);
    const visible = skill?.disableModelInvocation ? "disabled" : "model-visible";
    const text = skill?.description ?? skill;
    addItem(items, "system/skill-description", `${name} (${visible})`, text, itemPath(skill), "shorten description or disable model invocation if command-only");
  }

  for (const [i, tool] of asArray(options.selectedTools).entries()) {
    const label = itemName(tool, `selected tool ${i + 1}`);
    addItem(items, "system/selected-tool", label, tool, undefined, "check if tool must be active by default");
  }

  const snippets = options.toolSnippets;
  if (Array.isArray(snippets)) {
    for (const [i, snippet] of snippets.entries()) addItem(items, "system/tool-snippet", itemName(snippet, `tool snippet ${i + 1}`), snippet, undefined, "shorten promptSnippet if custom");
  } else {
    addItem(items, "system/tool-snippets", "toolSnippets", snippets, undefined, "inspect individual tool snippets if large");
  }

  const guidelines = options.promptGuidelines;
  if (Array.isArray(guidelines)) {
    for (const [i, guideline] of guidelines.entries()) addItem(items, "system/guideline", `guideline ${i + 1}`, guideline, undefined, "shorten custom guideline");
  } else {
    addItem(items, "system/guidelines", "promptGuidelines", guidelines, undefined, "shorten custom guidelines");
  }

  return items;
}

function findArrayByKey(value: any, key: string): any[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value?.[key])) return value[key];
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      const found = findArrayByKey(child, key);
      if (found.length) return found;
    }
  }
  return [];
}

function messageText(message: any): unknown {
  return message?.content ?? message;
}

function toolName(tool: any, index: number): string {
  return String(tool?.function?.name || tool?.name || tool?.toolSpec?.name || tool?.declarations?.[0]?.name || `tool ${index + 1}`);
}

function providerMessages(payload: any): any[] {
  const messages = findArrayByKey(payload, "messages");
  if (messages.length) return messages;
  const contents = findArrayByKey(payload, "contents");
  if (contents.length) return contents;
  if (Array.isArray(payload?.input)) return payload.input;
  if (payload?.input !== undefined) return [{ role: "input", content: payload.input }];
  return [];
}

function buildProviderItems(payload: any): { items: AuditItem[]; toolCount: number; messageCount: number; systemTokens: number; messageTokens: number; toolTokens: number; accountedTokens: number } {
  const items: AuditItem[] = [];
  const messages = providerMessages(payload);
  const tools = findArrayByKey(payload, "tools");

  const systemLike = payload?.system ?? payload?.system_instruction ?? payload?.systemPrompt ?? payload?.instructions;
  const systemTokens = countTokens(systemLike);
  addItem(items, "provider/system", "provider system/instructions", systemLike, undefined, "compare with system prompt components");

  let messageTokens = 0;
  for (const [i, message] of messages.entries()) {
    const role = message?.role || message?.author || "message";
    const value = messageText(message);
    const tokens = countTokens(value);
    messageTokens += tokens;
    addItem(items, "provider/message", `${role} ${i + 1}`, value, undefined, "old session context can dominate here");
  }

  let toolTokens = 0;
  for (const [i, tool] of tools.entries()) {
    const tokens = countTokens(tool);
    toolTokens += tokens;
    addItem(items, "provider/tool-schema", toolName(tool, i), tool, undefined, "large schema: consider slimmer tool or active-tool gating");
  }

  const accounted = systemTokens + messageTokens + toolTokens;
  const total = countTokens(payload);
  if (total > accounted) {
    const omitted = { ...payload };
    delete omitted.system;
    delete omitted.system_instruction;
    delete omitted.systemPrompt;
    delete omitted.instructions;
    delete omitted.messages;
    delete omitted.contents;
    delete omitted.input;
    delete omitted.tools;
    addItem(items, "provider/other", "provider payload other fields", omitted, undefined, "inspect raw JSON if unexpectedly large");
  }

  return { items, toolCount: tools.length, messageCount: messages.length, systemTokens, messageTokens, toolTokens, accountedTokens: accounted };
}

function topItems(items: AuditItem[], limit = 40): AuditItem[] {
  return [...items].sort((a, b) => b.tokens - a.tokens).slice(0, limit);
}

function markdown(snapshot: AuditSnapshot): string {
  const providerTotal = snapshot.totals.providerPayloadTokens ?? 0;
  const systemTotal = snapshot.totals.systemPromptTokens ?? 0;
  const lines: string[] = [];
  lines.push("# Prompt Audit", "");
  lines.push(`Captured: ${snapshot.capturedAt}`);
  if (snapshot.model) lines.push(`Model: ${snapshot.model}`);
  if (snapshot.prompt) lines.push(`Prompt: ${snapshot.prompt}`);
  lines.push(`Tokenizer: ${snapshot.tokenizer}`);
  lines.push("");
  lines.push("## Totals", "");
  lines.push(`- Provider payload: ${providerTotal.toLocaleString()} tokens`);
  lines.push(`- Chained system prompt: ${systemTotal.toLocaleString()} tokens`);
  if (snapshot.totals.providerSystemTokens !== undefined) lines.push(`- Provider system/instructions: ${snapshot.totals.providerSystemTokens.toLocaleString()} tokens`);
  if (snapshot.totals.providerMessageTokens !== undefined) lines.push(`- Provider messages: ${snapshot.totals.providerMessageTokens.toLocaleString()} tokens`);
  if (snapshot.totals.providerToolTokens !== undefined) lines.push(`- Provider tool schemas: ${snapshot.totals.providerToolTokens.toLocaleString()} tokens`);
  if (snapshot.provider) lines.push(`- Provider tools/messages: ${snapshot.provider.toolCount} tools / ${snapshot.provider.messageCount} messages`);
  lines.push("");
  lines.push("## Top Offenders", "");
  lines.push("| Rank | Category | Label | Tokens | Chars | Source | Suggested action |");
  lines.push("| ---: | --- | --- | ---: | ---: | --- | --- |");
  const rankedItems = topItems(snapshot.items.filter((item) => item.category !== "system" && item.category !== "provider/system"), 50);
  for (const [i, item] of rankedItems.entries()) {
    lines.push(`| ${i + 1} | ${esc(item.category)} | ${esc(item.label)} | ${item.tokens.toLocaleString()} | ${item.chars.toLocaleString()} | ${esc(item.source || "")} | ${esc(item.action || "")} |`);
  }
  lines.push("");
  lines.push("## By Category", "");
  const byCat = new Map<string, { tokens: number; chars: number; count: number }>();
  for (const item of snapshot.items) {
    const cur = byCat.get(item.category) || { tokens: 0, chars: 0, count: 0 };
    cur.tokens += item.tokens;
    cur.chars += item.chars;
    cur.count += 1;
    byCat.set(item.category, cur);
  }
  lines.push("| Category | Items | Tokens | Chars |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const [category, value] of [...byCat.entries()].sort((a, b) => b[1].tokens - a[1].tokens)) {
    lines.push(`| ${esc(category)} | ${value.count} | ${value.tokens.toLocaleString()} | ${value.chars.toLocaleString()} |`);
  }
  lines.push("");
  lines.push("Raw JSON companion includes all measured items and payload metadata.");
  return lines.join("\n");
}

function esc(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 240);
}

function auditDir(): string {
  return path.join(process.env.HOME || ".", ".pi", "prompt-audits");
}

function saveSnapshot(snapshot: AuditSnapshot): { json: string; md: string } {
  const dir = auditDir();
  mkdirSync(dir, { recursive: true });
  const stamp = snapshot.capturedAt.replace(/[:.]/g, "-");
  const json = path.join(dir, `${stamp}.json`);
  const md = path.join(dir, `${stamp}.md`);
  writeFileSync(json, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(md, `${markdown(snapshot)}\n`);
  return { json, md };
}

async function showLatest(ctx: ExtensionCommandContext, save: boolean) {
  if (!latest) {
    ctx.ui.notify("No prompt audit captured yet. Send a prompt first, then run /prompt-audit.", "warning");
    return;
  }
  const files = save ? saveSnapshot(latest) : null;
  const top = topItems(latest.items, 8)
    .map((item, i) => `${i + 1}. ${item.category}: ${item.label} — ${item.tokens} tokens`)
    .join("\n");
  const text = `Prompt audit: provider ${latest.totals.providerPayloadTokens ?? "?"} tokens, system ${latest.totals.systemPromptTokens ?? "?"} tokens\n\n${top}${files ? `\n\nSaved:\n${files.md}\n${files.json}` : ""}`;
  ctx.ui.notify(text, "info");
}

export default function promptAudit(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    lastSystemPrompt = event.systemPrompt || "";
    lastPrompt = event.prompt || "";
    lastOptions = event.systemPromptOptions || null;
  });

  pi.on("before_provider_request", (event) => {
    const payload = (event as any).payload;
    const provider = buildProviderItems(payload);
    const systemItems = buildSystemItems(lastSystemPrompt, lastOptions);
    const providerPayloadTokens = countTokens(payload);
    latest = {
      capturedAt: new Date().toISOString(),
      prompt: lastPrompt,
      model: `${(event as any).model?.provider || ""}/${(event as any).model?.id || ""}`.replace(/^\//, ""),
      tokenizer: "cl100k_base via js-tiktoken (estimate for non-OpenAI providers)",
      totals: {
        systemPromptTokens: countTokens(lastSystemPrompt),
        providerPayloadTokens,
        providerSystemTokens: provider.systemTokens,
        providerMessageTokens: provider.messageTokens,
        providerToolTokens: provider.toolTokens,
      },
      items: [...systemItems, ...provider.items],
      provider: {
        payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
        toolCount: provider.toolCount,
        messageCount: provider.messageCount,
      },
    };
  });

  pi.registerCommand("prompt-audit", {
    description: "Show the latest prompt/token audit top offenders",
    handler: async (_args, ctx) => showLatest(ctx, false),
  });

  pi.registerCommand("prompt-audit-save", {
    description: "Save the latest prompt/token audit as Markdown and JSON",
    handler: async (_args, ctx) => showLatest(ctx, true),
  });
}
