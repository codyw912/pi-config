import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface GuardRule {
  tool: string | string[];
  match: RegExp | ((input: Record<string, unknown>) => boolean);
  action: "block" | "confirm";
  message: string;
}

const PROTECTED_PATHS = [".env", ".git/", "node_modules/", ".pi/", "id_rsa", ".ssh/"];

const DANGEROUS_BASH_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\b|.*--force\b)/,
  /\bsudo\s+rm\b/,
  /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
  /\bchmod\s+777\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd[a-z]/,
  /\bgit\s+push\s+.*--force\b(?!-with-lease)/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+config\s+--global\b/,
  /\b(?:cargo|npm)\s+publish\b(?!.*--dry-run)/,
];

const GIT_COMMIT_ALLOWED_FLAGS = new Set([
  "-m", "--message",
  "-a", "--all",
  "--amend",
  "--allow-empty",
  "--no-edit",
]);

function stripQuotedStrings(command: string): string {
  return command
    .replace(/"(?:[^"\\]|\\.)*"/gs, '""')
    .replace(/'[^']*'/gs, "''");
}

function matchesShellCommand(command: string, pattern: RegExp): boolean {
  return pattern.test(stripQuotedStrings(command));
}

function checkGitCommit(command: string): string | null {
  if (!/\bgit\b.*\bcommit\b/.test(command)) return null;

  const stripped = stripQuotedStrings(command);
  const lines = stripped.split(/\n/);
  for (const line of lines) {
    if (!/\bgit\b.*\bcommit\b/.test(line)) continue;

    if (/GIT_(?:COMMITTER|AUTHOR)_(?:NAME|EMAIL)=/.test(line)) {
      return [
        "Blocked: overriding git identity is not allowed.",
        "Commits must use the user's configured identity.",
      ].join("\n");
    }

    if (/\bgit\s+.*-c\s+\S+/.test(line)) {
      return "Blocked: git -c config overrides are not allowed. Use the repo's git config.";
    }

    if (/\bgit\s+config\s+(?:--local\s+|--worktree\s+)?commit\.gpgsign\s+false\b/.test(line)) {
      return [
        "Blocked: changing commit.gpgsign to bypass signing is not allowed.",
        "Agents must not disable commit signing. Ask the user to sign the commit if signing blocks automation.",
      ].join("\n");
    }

    if (/\s--no-gpg-sign(?:\s|$)/.test(line)) {
      return [
        "Blocked: unsigned commits are not allowed.",
        "Agents must not bypass commit signing. Ask the user to sign the commit if signing blocks automation.",
      ].join("\n");
    }

    const beforeGit = line.split(/\bgit\b/)[0] ?? "";
    if (/\bSKIP=/.test(beforeGit)) {
      return "Blocked: SKIP= prefix to bypass pre-commit hooks is not allowed.";
    }

    const commitIdx = line.search(/\bcommit\b/);
    const afterCommit = line
      .slice(commitIdx + 6)
      // Only inspect flags that belong to the git commit invocation. A guarded
      // bash command can chain follow-up commands (for example
      // `git commit -m "msg" && git status --short`); flags from those later
      // commands must not be attributed to `git commit`.
      .split(/\s+(?:&&|\|\||;|\|)\s+/)[0];
    const flags = afterCommit.match(/(?:^|\s)(--?\S+)/g);
    if (!flags) continue;

    const disallowed: string[] = [];
    for (const raw of flags) {
      const flag = raw.trim().split("=")[0];
      if (!GIT_COMMIT_ALLOWED_FLAGS.has(flag)) {
        disallowed.push(flag);
      }
    }

    if (disallowed.length > 0) {
      return [
        `Blocked: git commit flag(s) not allowed: ${disallowed.join(", ")}`,
        `Only these flags are permitted: ${[...GIT_COMMIT_ALLOWED_FLAGS].join(", ")}`,
        "If you need other flags, ask the user.",
      ].join("\n");
    }
  }

  return null;
}

const RULES: GuardRule[] = [
  {
    tool: "bash",
    match: (input) => checkGitCommit(String(input.command ?? "")) !== null,
    action: "block",
    message: "",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /(?:^|\n|[;|&]{1,2})\s*(?:\S+\/)?pip3?\s/m),
    action: "block",
    message: "Blocked: use uv instead of pip.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /\bnpm\s+(?:install|i)\s+(?:.*\s)?-g\b|\bnpm\s+(?:install|i)\s+--global\b/),
    action: "block",
    message: "Blocked: global npm installs are not allowed.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /\bbrew\s+install\b|\bapt(?:-get)?\s+install\b|\byum\s+install\b|\bpacman\s+-S\b|\bdnf\s+install\b/),
    action: "block",
    message: "Blocked: system package installs are managed by the user.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /\bcargo\s+install\b(?!.*--path)/),
    action: "block",
    message: "Blocked: cargo install from registry is not allowed. Use cargo install --path . for local builds.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /(?:^|\n|[;|&]{1,2})\s*(?:\S+\/)?sops\s/m),
    action: "block",
    message: "Blocked: sops and secret decryption must be done by the user.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /\bage\b.*-d\b|\bgpg\s+--decrypt\b|\bgpg\s+-d\b|\bvault\s+read\b|\bvault\s+kv\s+get\b/),
    action: "block",
    message: "Blocked: secret decryption must be done by the user.",
  },
  {
    tool: "bash",
    match: (input) => matchesShellCommand(String(input.command ?? ""), /curl\s.*\|\s*(?:sudo\s+)?(?:ba)?sh|wget\s.*\|\s*(?:sudo\s+)?(?:ba)?sh/),
    action: "block",
    message: "Blocked: piping remote scripts to shell is not allowed.",
  },
  {
    tool: ["write", "edit"],
    match: (input) => {
      const target = String(input.path ?? "");
      return PROTECTED_PATHS.some((protectedPath) => target.includes(protectedPath));
    },
    action: "confirm",
    message: "Protected path write detected. Allow it?",
  },
  {
    tool: "bash",
    match: (input) => DANGEROUS_BASH_PATTERNS.some((pattern) => pattern.test(String(input.command ?? ""))),
    action: "confirm",
    message: "Dangerous command detected. Allow it?",
  },
];

function matchesRule(rule: GuardRule, toolName: string, input: Record<string, unknown>): boolean {
  const tools = Array.isArray(rule.tool) ? rule.tool : [rule.tool];
  if (!tools.includes(toolName)) return false;

  if (rule.match instanceof RegExp) {
    const text = toolName === "bash" ? String(input.command ?? input.cmd ?? "") : JSON.stringify(input);
    return rule.match.test(text);
  }
  return rule.match(input);
}

function getRuleMessage(rule: GuardRule, toolName: string, input: Record<string, unknown>): string {
  if (rule.message === "" && typeof rule.match === "function" && toolName === "bash") {
    return checkGitCommit(String(input.command ?? "")) ?? "Blocked by guard.";
  }
  return rule.message;
}

export default function guardExtension(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    const input = (event.input ?? {}) as Record<string, unknown>;

    for (const rule of RULES) {
      if (!matchesRule(rule, event.toolName, input)) continue;
      const message = getRuleMessage(rule, event.toolName, input);

      if (rule.action === "block") {
        return { block: true, reason: message };
      }

      if (ctx.hasUI) {
        const ok = await ctx.ui.confirm("Guard", message);
        if (!ok) return { block: true, reason: "Blocked by user" };
      } else {
        return { block: true, reason: message };
      }
    }
  });
}
