# Pre-Push Validation

Run validation before pushing. Uses parallel subagents for speed on Claude Code web.

## Instructions

### Step 1: Detect Changes

```bash
git diff --name-only HEAD 2>/dev/null
git diff --name-only --cached 2>/dev/null
```

- **Skip all**: Only `.md` files changed
- **Lint only**: Only `.json` locale files changed

### Step 2: Generate API Types (if needed)

If `volleymanager-openapi.yaml` changed:
```bash
cd /home/user/volleykit/web-app && npm run generate:api
```

### Step 3: Parallel Validation (CRITICAL)

**Launch ALL THREE subagents in a SINGLE message** using the Task tool:

```
Task 1: { subagent_type: "Bash", prompt: "cd /home/user/volleykit/web-app && npm run lint", description: "Run lint check" }
Task 2: { subagent_type: "Bash", prompt: "cd /home/user/volleykit/web-app && npm run knip", description: "Run knip check" }
Task 3: { subagent_type: "Bash", prompt: "cd /home/user/volleykit/web-app && npm test", description: "Run test suite" }
```

### Step 4: Build (only if all pass)

```bash
cd /home/user/volleykit/web-app && npm run build
```

### Step 5: Summary

```
## Validation Results

✓ Lint  ✓ Knip  ✓ Test  ✓ Build

Ready to push!
```

Or on failure:
```
## Validation Results

✓ Lint  ✗ Test  ⊘ Build

Issues:
- Test: [failed test names]
```
