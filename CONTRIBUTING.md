# Contributing to tetra

Thanks for your interest in tetra! Contributions of all kinds are welcome —
bug reports, docs, new skill packs, and code.

## Project layout

```
src/
  cli.ts        CLI entry + argument parsing
  config.ts     config loading, defaults, validation
  pipeline.ts   the orchestrator: write -> gate -> review -> fix loop -> stop
  exec.ts       command execution + {{TOKEN}} substitution
  types.ts      shared types
skills/         bundled, first-party rubric packs (markdown)
examples/demo/  a runnable example (deliberately buggy fixture)
```

## Local setup

```bash
npm install
npm run build      # compiles src/ -> dist/
node dist/cli.js --help
node dist/cli.js run "<task>" --dry-run
```

## Running the demo

See `examples/demo/README.md` — it walks through a full live run against a
deliberately buggy fixture.

## Design principles (please preserve these)

- **Writer != reviewer.** The agent that writes is not the agent that judges.
- **Gate before anything.** The project's own tests must pass before a change
  is considered done.
- **Stop at the human line.** tetra never commits, pushes, or opens PRs. The
  `requireHumanForPush` boundary is hard and must stay on.
- **Configurable, never forced.** Any model can play any role; agents and
  skills are registry entries referenced by stages.

## Adding an agent or a skill

- **Agent:** add a named entry under `agents` in your `tetra.config.json` with
  a command template (tokens: `{{PROMPT_FILE}}`, `{{DIFF_FILE}}`, `{{BASE}}`,
  `{{TASK}}`), then reference it from a stage via `use`.
- **Skill:** add a markdown rubric, register it under `skills`, and list it in a
  stage's `skills` array. tetra injects it into that stage's prompt.

## Pull requests

- Keep PRs small and focused on a single change.
- Make sure `npm run build` is clean.
- Describe what changed and why; link any related issue.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, and what happened.
A minimal config + command that triggers it helps a lot.
