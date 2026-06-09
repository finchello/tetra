/**
 * tetra - shared types for the multi-agent pipeline.
 *
 * The pipeline is intentionally configurable: every stage references an
 * "agent" (a named command) from a registry, so users can assign any model
 * to any role. tetra ships an opinionated default (write=agy, review=codex)
 * but never forces it.
 */

/** A named, runnable agent. The command is a template; see exec.ts for tokens. */
export interface AgentDef {
  /** Shell command template. Tokens: {{PROMPT_FILE}}, {{TASK}}, {{DIFF_FILE}}, {{BASE}}. */
  command: string;
}

/**
 * A named skill: a vetted, first-party rubric (markdown) injected into a
 * stage's prompt when that stage fires it. tetra ships its own skill packs;
 * users can register their own. tetra never auto-installs third-party skills.
 */
export interface SkillDef {
  /** Path to the skill's markdown file. Absolute, or relative to the repo. */
  path: string;
}

export type StageName = "plan" | "write" | "gate" | "review" | "fix";

/** One step in the pipeline. References a registered agent (use) or a raw command. */
export interface StageDef {
  stage: StageName;
  use?: string;
  command?: string;
  /** Regex matched against stdout; a match means "changes requested" even on exit 0. */
  failPattern?: string;
  /** Names of skills (from the registry) to inject into this stage's prompt. */
  skills?: string[];
}

export interface TetraConfig {
  baseBranch: string;
  maxFixIterations: number;
  /** HARD boundary: tetra never commits, pushes, or opens PRs. Always true. */
  requireHumanForPush: true;
  agents: Record<string, AgentDef>;
  skills: Record<string, SkillDef>;
  pipeline: StageDef[];
}

export interface StageResult {
  stage: StageName;
  ok: boolean;
  exitCode: number;
  changesRequested?: boolean;
  output: string;
}

export interface RunResult {
  ok: boolean;
  iterations: number;
  stages: StageResult[];
  summary: string;
}
