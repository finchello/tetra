# Skill: testing-strategy

When implementing the task, treat tests as part of the deliverable, not an
afterthought.

## Rules

- **Test the behaviour the task describes**, including the reproduction case if
  the task references a bug. A bug fix without a test that would have caught it
  is incomplete.
- **Cover the edge cases**, not just the happy path: empty / null / boundary /
  large / malformed input, and any documented error path.
- **Test the user-facing contract**, not just an internal helper — exercise the
  same entry point a caller would use.
- **Keep tests deterministic** — no reliance on wall-clock time, network, or
  ordering unless explicitly under test.
- **Run the project's own test command** and make it green before considering
  the task done. Do not weaken or skip existing assertions to make them pass.

## Output expectation

The change should leave the project's test suite green, with at least one new or
updated test that directly exercises the task's behaviour.
