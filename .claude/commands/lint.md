# Quick Lint Check

Lint every package touched by the current changes. Cached — counts towards the
commit gate, never re-run at commit time.

```bash
scripts/validate.sh lint
```

Report `✓ Lint` or `✗ Lint: [first error]`.
