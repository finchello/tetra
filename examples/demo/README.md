# tetra demo

A deliberately buggy fixture for a live end-to-end test of tetra.

`sum.js` has `add()` subtracting instead of adding; `sum.test.js` catches it.

## Run the live test (on a machine with `claude` + `codex` authenticated)

```bash
# from the tetra repo root, make `tetra` runnable:
npm install && npm run build && npm link

cd examples/demo
git init && git add . && git commit -m "demo: buggy add()"

tetra run "Fix add() in sum.js so it returns the sum; make npm test pass." --base HEAD
```

Watch: write (claude) -> gate (npm test) -> review (codex) -> fix loop -> STOP.
