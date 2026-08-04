# Quick Test Check

Run tests for every package touched by the current changes. Passing results are
cached and count towards the commit gate, so they are never re-run at commit time.

```bash
scripts/validate.sh test
```

Output: `✓ Test (N passed)` or `✗ Test: [failed test names]`
