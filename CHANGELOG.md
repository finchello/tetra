# Changelog

All notable changes to this project are documented here.
This project adheres to semantic versioning.

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

### Known limitations
- The Antigravity (`agy`) agent's non-interactive edit behaviour is not yet
  fully verified end-to-end; `claude` + `codex` are validated.
