#!/usr/bin/env node
/** tetra — CLI entry point. */
import { parseArgs } from "node:util";
import { loadConfig, applyPlanFlags } from "./config.js";
import { runPipeline } from "./pipeline.js";

const HELP = `tetra — a configurable, gated, cross-reviewed multi-agent code pipeline.

Usage:
  tetra run "<task>" [options]

Options:
  --repo <path>     Target repository (default: current directory)
  --base <ref>      Base git ref for the review diff (default: from config / "main")
  --config <path>   Explicit config file (default: tetra.config.json in repo)
  --plan            Add default plan + plan-review stages for this run (no-op if
                    the pipeline already has them)
  --no-plan         Strip any plan / plan-review stages for this run
  --dry-run         Print the pipeline plan without running anything
  -h, --help        Show this help

Pipeline:  write → gate → review → (fix loop) → STOP
tetra never commits, pushes, or opens PRs — that final step is always yours.
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      repo: { type: "string" },
      base: { type: "string" },
      config: { type: "string" },
      plan: { type: "boolean", default: false },
      "no-plan": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const [command, ...rest] = positionals;
  if (command !== "run") {
    console.error(`Unknown command "${command}". Try: tetra run "<task>"`);
    process.exit(1);
  }

  const task = rest.join(" ").trim();
  if (!task) {
    console.error('Missing task. Usage: tetra run "<task>"');
    process.exit(1);
  }

  const cwd = values.repo ? values.repo : process.cwd();
  const config = loadConfig(cwd, values.config);
  if (values.base) config.baseBranch = values.base;
  applyPlanFlags(config, Boolean(values.plan), Boolean(values["no-plan"]));

  const result = await runPipeline(config, {
    cwd,
    task,
    dryRun: Boolean(values["dry-run"]),
  });

  console.log("\n" + "─".repeat(60));
  console.log(`[tetra] ${result.summary}`);
  console.log(`[tetra] iterations: ${result.iterations} · stages run: ${result.stages.length}`);
  console.log("─".repeat(60) + "\n");

  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`[tetra] error: ${err.message}`);
  process.exit(1);
});
