# Pre-Push Validation

Run validation before pushing. Optimized for mobile with parallel execution.

## Instructions

1. **Detect changes** (check uncommitted files):
```bash
git diff --name-only && git diff --name-only --cached
```

2. **Generate API types** (if OpenAPI spec changed):
```bash
cd web-app && npm run generate:api
```

3. **Run parallel validations** using Task tool sub-agents:

Launch ALL THREE agents IN PARALLEL (single message, multiple Task calls):

**Agent 1 - Lint**:
- subagent_type: "general-purpose"
- prompt: "cd web-app && npm run lint. Reply: LINT: PASS or LINT: FAIL with first 3 errors"

**Agent 2 - Knip**:
- subagent_type: "general-purpose"
- prompt: "cd web-app && npm run knip. Reply: KNIP: PASS or KNIP: FAIL with summary"

**Agent 3 - Test**:
- subagent_type: "general-purpose"
- prompt: "cd web-app && npm test. Reply: TEST: PASS (N passed) or TEST: FAIL with failed names"

4. **Build** (only if all parallel checks pass):
```bash
cd web-app && npm run build
```

5. **Output concise summary**:

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
