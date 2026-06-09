/** Config loading + defaults + validation for tetra. */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TetraConfig } from "./types.js";

/** Package root (dist/ -> ..), used to resolve bundled skill packs. */
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function bundledSkill(file: string): string {
  return join(PKG_ROOT, "skills", file);
}

export const DEFAULT_CONFIG: TetraConfig = {
  baseBranch: "main",
  maxFixIterations: 3,
  requireHumanForPush: true,
  agents: {
    claude: { command: "claude -p < {{PROMPT_FILE}}" },
    // agy reads the prompt from stdin (bare invocation; `-p`/`--print` demands an
    // inline arg and rejects a redirect). agy's edit behaviour is still unverified
    // and tracked separately: does it actually apply file edits, does it need
    // --dangerously-skip-permissions, does bare stdin risk an interactive hang?
    // Likely proper fix: a {{PROMPT}} inline token used as `agy -p "{{PROMPT}}"`.
    agy: { command: "agy < {{PROMPT_FILE}}" },
    codex: { command: "codex exec < {{PROMPT_FILE}}" },
  },
  skills: {
    "code-review": { path: bundledSkill("code-review.md") },
    "testing-strategy": { path: bundledSkill("testing-strategy.md") },
  },
  pipeline: [
    { stage: "write", use: "claude", skills: ["testing-strategy"] },
    { stage: "gate", command: "npm test" },
    { stage: "review", use: "codex", skills: ["code-review"], failPattern: "REQUEST.?CHANGES|BLOCK" },
    { stage: "fix", use: "claude", skills: ["code-review", "testing-strategy"] },
  ],
};

const CONFIG_NAMES = ["tetra.config.json", ".tetra.json"];

export function loadConfig(cwd: string, explicitPath?: string): TetraConfig {
  let path: string | undefined;
  if (explicitPath) {
    path = resolve(cwd, explicitPath);
    if (!existsSync(path)) throw new Error(`Config not found: ${path}`);
  } else {
    path = CONFIG_NAMES.map((n) => resolve(cwd, n)).find(existsSync);
  }

  if (!path) return DEFAULT_CONFIG;

  let parsed: Partial<TetraConfig>;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Could not parse ${path}: ${(e as Error).message}`);
  }

  const config: TetraConfig = {
    ...DEFAULT_CONFIG,
    ...parsed,
    requireHumanForPush: true,
    agents: { ...DEFAULT_CONFIG.agents, ...(parsed.agents ?? {}) },
    skills: { ...DEFAULT_CONFIG.skills, ...(parsed.skills ?? {}) },
    pipeline: parsed.pipeline ?? DEFAULT_CONFIG.pipeline,
  };

  validate(config);
  return config;
}

function validate(c: TetraConfig): void {
  if (c.maxFixIterations < 0) throw new Error("maxFixIterations must be >= 0");
  for (const step of c.pipeline) {
    if (!step.use && !step.command) {
      throw new Error(`Stage "${step.stage}" must define either "use" or "command".`);
    }
    if (step.use && !c.agents[step.use]) {
      throw new Error(`Stage "${step.stage}" references unknown agent "${step.use}".`);
    }
    for (const skill of step.skills ?? []) {
      if (!c.skills[skill]) {
        throw new Error(`Stage "${step.stage}" fires unknown skill "${skill}".`);
      }
    }
  }
}
