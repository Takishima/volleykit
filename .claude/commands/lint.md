# Quick Lint Check

Lint every package touched by the current changes. Passing results are cached
and count towards the commit gate, so they are never re-run at commit time.

```bash
scripts/validate.sh lint
```

Output: `✓ Lint` or `✗ Lint: [first error]`
