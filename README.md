# tetra

**A configurable, gated, cross-reviewed multi-agent code pipeline.**

`tetra` runs a disciplined loop over any repository:

```
write → gate → review → (fix loop) → STOP
```

- **write** — an agent implements the task in the working tree.
- **gate** — the project's *own* tests/lint run. Nothing proceeds past a red gate.
- **review** — an *independent* agent (ideally a different model) reviews the diff.
- **fix loop** — if the gate fails or the reviewer requests changes, the feedback is handed back to the agent and the loop repeats (up to a configurable limit).
- **STOP** — `tetra` leaves a clean working tree for you. **It never commits, pushes, or opens PRs.** That step is always yours.

The idea: keep the *opinion* (gate-before-merge, cross-model independent review, a bounded auto-fix loop) but never force a particular toolchain. Every stage's agent is swappable.

## Why

Most agent tools let one model write *and* judge its own work. `tetra` separates the writer from the reviewer, insists the project's real tests pass before anything is considered done, and stops at the human-owned line (commit/push/PR).

## Install

```bash
npm install -g tetra-run
```

Requires Node.js ≥ 20, plus whatever CLIs your config references (e.g. `claude`, `codex`) installed and authenticated.

## Usage

```bash
tetra run "Fix the off-by-one in split() and add a test" --repo . --base main
tetra run "..." --dry-run     # print the plan without executing anything
```

## Configure

Copy `tetra.config.example.json` to `tetra.config.json` in your repo. Agents are named once and referenced by stages, so you can assign **any model to any role**:

```json
{
  "agents": {
    "claude": { "command": "claude -p {{PROMPT_FILE}}" },
    "codex":  { "command": "codex exec {{PROMPT_FILE}}" }
  },
  "pipeline": [
    { "stage": "write",  "use": "claude" },
    { "stage": "gate",   "command": "npm test" },
    { "stage": "review", "use": "codex", "failPattern": "REQUEST.?CHANGES" },
    { "stage": "fix",    "use": "claude" }
  ]
}
```

Want the writer and reviewer the other way round? Swap the `use` values. The gate is just a shell command — `npm test`, `pytest -q`, `cargo test`, anything.

### Skills (per-stage rubrics)

Each stage can **fire skills** — vetted markdown rubrics that get injected into
that stage's prompt. tetra ships two first-party skill packs (`code-review`,
`testing-strategy`) and you can register your own:

```json
{
  "skills": {
    "code-review": { "path": "./skills/my-code-review.md" }
  },
  "pipeline": [
    { "stage": "write",  "use": "agy",    "skills": ["testing-strategy"] },
    { "stage": "review", "use": "codex",  "skills": ["code-review"] }
  ]
}
```

So the writer always sees your testing rubric, the reviewer always applies your
review rubric, etc. tetra **bundles its own skills and injects them** — it does
not reach into or auto-install another tool's private skill system, and it never
bulk-installs third-party skills.

### Command tokens

| Token | Expands to |
|---|---|
| `{{TASK}}` | the task string you passed |
| `{{PROMPT_FILE}}` | temp file with the full prompt for the agent |
| `{{DIFF_FILE}}` | temp file with the working-tree diff vs `baseBranch` |
| `{{BASE}}` | the base git ref |

## Safety

- **Never auto-commits / pushes / opens PRs** — `requireHumanForPush` is a hard, always-on boundary.
- **Bounded loop** — `maxFixIterations` prevents infinite retries.
- Treat repositories and their scripts as untrusted; review what your configured agents are allowed to run.

## Status

Early MVP (v0.1). The core loop (write → gate → review → fix → stop) and configurable agents are in place. Planned next: a `plan` pre-stage, richer review-verdict parsing, and per-run reports.

## License

MIT
