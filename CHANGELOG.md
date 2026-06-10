# Changelog

All notable changes to this project are documented here.
This project adheres to semantic versioning.

## [Unreleased]

### Added
- Optional `plan` / `plan-review` pre-stage at the start of the pipeline: an agent
  drafts an implementation plan, an independent agent critiques it (ending with an
  `APPROVE` / `REQUEST-CHANGES` verdict), and the planner revises up to
  `maxPlanIterations` (default `2`) rounds. The approved plan is injected into the
  `write`/`fix` prompts as a `## Plan` section. Entirely optional — a pipeline
  without these stages behaves exactly as before. If the plan is never approved,
  tetra proceeds to write with the last plan (the hard gate still protects).

### Changed
- Verdict hardening: every `review` and `plan-review` prompt now ends with an
  explicit instruction to emit a single `APPROVE` / `REQUEST-CHANGES` line, and
  verdict detection runs for those stages even without a configured `failPattern`.

### Fixed
- Corrected the stale note claiming the `agy` agent was unverified: `agy` is
  verified for write/fix (non-interactive `-p`); it is not suitable for
  stdout-consuming roles (review, plan, plan-review) because it suppresses stdout
  off-TTY.

## [0.1.0] - 2026-06-09

### Added
- Initial release: a configurable, gated, cross-reviewed multi-agent pipeline
  (`write -> gate -> review -> fix loop -> stop`).
- Configurable agent registry — any model can play any stage via `use`.
- Bundled first-party skill packs (`code-review`, `testing-strategy`) injected
  into stage prompts; user skills supported.
- Robust review verdict detection: a trailing `APPROVE` / `REQUEST-CHANGES`
  line is authoritative, with a `failPattern` fallback.
- Hard safety boundary: tetra never commits, pushes, or opens PRs.
- `--dry-run` to preview the pipeline plan.
- Runnable example under `examples/demo`.
- Verified default `agy` agent invocation (non-interactive `-p` pointer to the prompt file); agy is writer/fix-capable but not reviewer-capable (suppresses stdout off-TTY).

### Known limitations
- The Antigravity (`agy`) agent suppresses stdout when not attached to a TTY, so it
  cannot serve stdout-consuming roles (review; and, as of Unreleased, plan /
  plan-review). It is verified for write/fix. `claude` + `codex` cover all roles.
