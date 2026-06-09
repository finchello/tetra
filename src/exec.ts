/** Command execution + template token substitution. */
import { spawn } from "node:child_process";

export interface ExecContext {
  /** The user's task description. */
  task: string;
  /** Path to a temp file containing the full prompt for an agent. */
  promptFile: string;
  /** Path to a temp file containing the current diff (for review stages). */
  diffFile: string;
  /** Base git ref. */
  base: string;
}

/** Replace {{TOKEN}} placeholders in a command template. */
export function renderCommand(template: string, ctx: ExecContext): string {
  return template
    .replaceAll("{{PROMPT_FILE}}", ctx.promptFile)
    .replaceAll("{{DIFF_FILE}}", ctx.diffFile)
    .replaceAll("{{BASE}}", ctx.base)
    .replaceAll("{{TASK}}", ctx.task);
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a shell command in `cwd`, streaming output to the console while also
 * capturing it. Uses the platform shell so config commands can use pipes etc.
 */
export function run(command: string, cwd: string): Promise<ExecResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });

    child.on("close", (code) => {
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      resolvePromise({ exitCode: 127, stdout, stderr: stderr + String(err) });
    });
  });
}
