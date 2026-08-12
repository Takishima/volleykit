# Quick Test Check

Test every package touched by the current changes. Cached — counts towards the
commit gate, never re-run at commit time.

```bash
scripts/validate.sh test
```

Report `✓ Test (N passed)` or `✗ Test: [failed test names]`.
