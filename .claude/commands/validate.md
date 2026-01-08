# Pre-Push Validation

Run validation before pushing. Optimized for mobile with parallel execution.

## Instructions

1. **Detect changes** (quick check what files changed):
```bash
cd /home/user/volleykit/web-app && git diff --name-only HEAD 2>/dev/null | head -20
```

2. **Run parallel validations** using Task tool sub-agents:

Launch ALL THREE of these agents IN PARALLEL (single message, multiple Task calls):

**Agent 1 - Lint**:
- subagent_type: "general-purpose"
- prompt: "cd /home/user/volleykit/web-app && npm run lint. Reply with ONLY: LINT: PASS or LINT: FAIL with first 3 errors"

**Agent 2 - Knip**:
- subagent_type: "general-purpose"
- prompt: "cd /home/user/volleykit/web-app && npm run knip. Reply with ONLY: KNIP: PASS or KNIP: FAIL with summary"

**Agent 3 - Test**:
- subagent_type: "general-purpose"
- prompt: "cd /home/user/volleykit/web-app && npm test. Reply with ONLY: TEST: PASS (N passed) or TEST: FAIL with failed test names"

3. **Build** (only if all parallel checks pass):
```bash
cd /home/user/volleykit/web-app && npm run build
```

4. **Output concise summary**:

```
✓ Lint  ✓ Knip  ✓ Test  ✓ Build

Ready to push!
```

Or on failure:
```
✓ Lint  ✗ Knip  ✓ Test  ⊘ Build

Issues:
- Knip: unused export in helpers.ts
```
