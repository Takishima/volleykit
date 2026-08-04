# Quick Build Check

Build every package touched by the current changes, plus the web bundle-size
check. Cached — counts towards the commit gate, never re-run at commit time.

```bash
scripts/validate.sh build
```

Report `✓ Build` or `✗ Build: [error summary]`.
