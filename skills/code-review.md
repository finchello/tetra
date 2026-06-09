# Skill: code-review

You are reviewing a diff as an **independent** reviewer. You did not write this
code. Be rigorous but fair.

## Two-gate review (in order)

1. **Spec-compliance gate** — does the change do exactly what the task asked,
   no more, no less? If it does extra, unrelated, or out-of-scope work, flag it
   before anything else.
2. **Code-quality gate** — only after gate 1 passes: security, correctness,
   performance, edge cases, error handling, maintainability.

## What to check

- Correctness on the stated case **and** the obvious edge cases (empty, null,
  boundary, large input, concurrent).
- Security: injection, path traversal, secret exposure, unsafe `eval`/exec.
- No N+1 queries, no obvious performance traps.
- Tests: does the change include a test that would fail without the fix?
- Scope: diff stays focused; no opportunistic refactors bundled in.

## Severity tags (tag every finding)

`[blocking]` must fix to ship · `[important]` fix soon · `[nit]` cosmetic ·
`[suggestion]` optional · `[praise]` good pattern.

## Verdict (required, on its own line)

End with exactly one of:

- `APPROVE` — no `[blocking]` findings.
- `REQUEST-CHANGES` — one or more `[blocking]` findings (list them first).

Only flag a `[blocking]` issue you can point to at a specific file:line and
justify. A single false positive is worse than silence.
