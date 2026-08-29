# Quick Knip Check

Detect dead code in every package touched by the current changes. Cached —
counts towards the commit gate, never re-run at commit time.

```bash
scripts/validate.sh knip
```

Report `✓ Knip` or `✗ Knip: [first finding]`.
