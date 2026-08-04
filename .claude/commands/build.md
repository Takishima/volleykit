# Quick Build Check

Build every package touched by the current changes, in dependency order, plus
the web bundle size check. Passing results are cached and count towards the
commit gate, so they are never re-run at commit time.

```bash
scripts/validate.sh build
```

Output: `✓ Build` or `✗ Build: [error summary]`
