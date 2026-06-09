/** The tetra pipeline orchestrator: write -> gate -> review -> fix loop -> stop. */
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, isAbsolute, resolve } from "node:path";
import type { StageDef, StageResult, RunResult, TetraConfig } from "./types.js";
import { run, renderCommand, type ExecContext } from "./exec.js";

/** Read and concatenate the markdown for the skills a stage fires. */
function readSkills(config: TetraConfig, stage: StageDef, cwd: string): string {
  const names = stage.skills ?? [];
  const blocks: string[] = [];
  for (const name of names) {
    const def = config.skills[name];
    const path = isAbsolute(def.path) ? def.path : resolve(cwd, def.path);
    try {
      blocks.push(readFileSync(path, "utf8").trim());
    } catch {
      console.warn(`[tetra] warning: could not read skill "${name}" at ${path}; skipping.`);
    }
  }
  return blocks.join("\n\n---\n\n");
}

export interface RunOptions {
  cwd: string;
  task: string;
  dryRun: boolean;
}

function findStage(config: TetraConfig, name: StageDef["stage"]): StageDef | undefined {
  return config.pipeline.find((s) => s.stage === name);
}

function commandFor(config: TetraConfig, stage: StageDef): string {
  if (stage.use) return config.agents[stage.use].command;
  return stage.command!;
}

function label(config: TetraConfig, stage: StageDef): string {
  return stage.use ? `${stage.stage} (${stage.use})` : stage.stage;
}

export async function runPipeline(config: TetraConfig, opts: RunOptions): Promise<RunResult> {
  const work = mkdtempSync(join(tmpdir(), "tetra-"));
  const ctx: ExecContext = {
    task: opts.task,
    promptFile: join(work, "prompt.md"),
    diffFile: join(work, "diff.patch"),
    base: config.baseBranch,
  };

  const writeStage = findStage(config, "write");
  const gateStage = findStage(config, "gate");
  const reviewStage = findStage(config, "review");
  const fixStage = findStage(config, "fix");

  if (!writeStage) throw new Error('Pipeline must include a "write" stage.');

  const stages: StageResult[] = [];

  if (opts.dryRun) {
    console.log("\n[tetra] DRY RUN - no commands will execute.\n");
    for (const s of config.pipeline) {
      console.log(`  ${label(config, s)}:`);
      if (s.skills?.length) console.log(`    skills: ${s.skills.join(", ")}`);
      console.log(`    ${renderCommand(commandFor(config, s), ctx)}\n`);
    }
    console.log("[tetra] STOP - tetra never commits/pushes/opens PRs (human-confirmed step).\n");
    return { ok: true, iterations: 0, stages, summary: "dry-run only" };
  }

  for (let iter = 0; iter <= config.maxFixIterations; iter++) {
    const isFirst = iter === 0;
    const codeStage = isFirst ? writeStage : fixStage;
    if (!codeStage) break;

    const codeSkills = readSkills(config, codeStage, opts.cwd);
    writeFileSync(ctx.promptFile, buildPrompt(opts.task, stages, isFirst, codeSkills));
    const codeRes = await runStage(config, codeStage, ctx, opts.cwd);
    stages.push(codeRes);
    if (!codeRes.ok) {
      return done(stages, iter, `Stopped: "${codeStage.stage}" stage failed (exit ${codeRes.exitCode}).`);
    }

    if (gateStage) {
      const gateRes = await runStage(config, gateStage, ctx, opts.cwd);
      stages.push(gateRes);
      if (!gateRes.ok) {
        if (iter === config.maxFixIterations) {
          return done(stages, iter, "Stopped: gate still failing after max fix iterations.");
        }
        console.log("\n[tetra] Gate failed -> fix loop.\n");
        continue;
      }
    }

    if (reviewStage) {
      await captureDiff(ctx, opts.cwd);
      const reviewSkills = readSkills(config, reviewStage, opts.cwd);
      writeFileSync(ctx.promptFile, buildReviewPrompt(opts.task, ctx.diffFile, reviewSkills));
      const reviewRes = await runStage(config, reviewStage, ctx, opts.cwd);
      stages.push(reviewRes);
      if (reviewRes.changesRequested || !reviewRes.ok) {
        if (iter === config.maxFixIterations) {
          return done(stages, iter, "Stopped: reviewer still requesting changes after max fix iterations.");
        }
        console.log("\n[tetra] Review requested changes -> fix loop.\n");
        continue;
      }
    }

    return done(stages, iter, "Clean: gate passed and review approved. Working tree left for your review - commit/push is yours.");
  }

  return done(stages, config.maxFixIterations, "Stopped: exhausted fix iterations.");
}

async function runStage(config: TetraConfig, stage: StageDef, ctx: ExecContext, cwd: string): Promise<StageResult> {
  const cmd = renderCommand(commandFor(config, stage), ctx);
  console.log(`\n[tetra] -- ${label(config, stage)} --`);
  console.log(`[tetra] $ ${cmd}\n`);
  const res = await run(cmd, cwd);

  let changesRequested = false;
  if (stage.failPattern) {
    changesRequested = new RegExp(stage.failPattern, "i").test(res.stdout);
  }
  return {
    stage: stage.stage,
    ok: res.exitCode === 0 && !changesRequested,
    exitCode: res.exitCode,
    changesRequested,
    output: res.stdout + res.stderr,
  };
}

async function captureDiff(ctx: ExecContext, cwd: string): Promise<void> {
  const res = await run(`git --no-pager diff ${ctx.base}`, cwd);
  writeFileSync(ctx.diffFile, res.stdout);
}

function skillHeader(skills: string): string {
  return skills ? `# Skills to apply\n\n${skills}\n\n` : "";
}

function buildPrompt(task: string, prior: StageResult[], isFirst: boolean, skills: string): string {
  const rules = `# Rules\n- Make the change in the working tree only. Do NOT commit, push, or open a PR.\n- Follow the target repository's own conventions and CONTRIBUTING guidelines.\n`;
  if (isFirst) {
    return `${skillHeader(skills)}# Task\n\n${task}\n\n${rules}`;
  }
  const feedback = prior
    .slice(-2)
    .map((s) => `## ${s.stage} output\n\n${s.output.slice(-4000)}`)
    .join("\n\n");
  return `${skillHeader(skills)}# Task\n\n${task}\n\n# Previous attempt needs fixing\n\nAddress the feedback below, then stop. Do NOT commit or push.\n\n${feedback}\n`;
}

function buildReviewPrompt(task: string, diffFile: string, skills: string): string {
  let diff = "";
  try {
    diff = readFileSync(diffFile, "utf8");
  } catch {
    diff = "(no diff captured)";
  }
  const fence = "```";
  return `${skillHeader(skills)}# Task under review\n\n${task}\n\n# Diff to review\n\n${fence}diff\n${diff}\n${fence}\n`;
}

function done(stages: StageResult[], iter: number, summary: string): RunResult {
  const ok = summary.startsWith("Clean");
  return { ok, iterations: iter + 1, stages, summary };
}
