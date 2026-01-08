---
name: validate
description: Run pre-push validation (lint, knip, test, build) with parallel subagents
autoInvoke: before-push
---

# Validation Skill

Run pre-push validation using parallel subagents for maximum speed on Claude Code web.

## When to Use (Automatic Triggers)

**AUTOMATICALLY invoke this skill when**:
- User says "push", "git push", or is about to push code
- User says "validate", "check", "run checks", "pre-push"
- User asks to "commit and push" changes
- After completing code changes that modify `.ts`, `.tsx`, `.js`, `.jsx` files
- User says "ready to push" or "before I push"

## Execution Strategy

**CRITICAL**: Use parallel subagents for speed. Launch lint, knip, and test simultaneously.

### Phase 1: Quick Check (5 seconds)

Determine what changed:
```bash
git diff --name-only HEAD 2>/dev/null
git diff --name-only --cached 2>/dev/null
```

**Skip all if**: Only `.md` documentation files changed
**Lint only if**: Only `.json` locale files changed

### Phase 2: API Generation (if needed)

If `volleymanager-openapi.yaml` changed:
```bash
cd web-app && npm run generate:api
```

### Phase 3: Parallel Validation (MUST USE SUBAGENTS)

**Launch ALL THREE subagents in a SINGLE message** using the Task tool:

```
Task 1: { subagent_type: "Bash", prompt: "cd web-app && npm run lint", description: "Run lint check" }
Task 2: { subagent_type: "Bash", prompt: "cd web-app && npm run knip", description: "Run knip check" }
Task 3: { subagent_type: "Bash", prompt: "cd web-app && npm test", description: "Run test suite" }
```

### Phase 4: Build (Sequential)

**Only after ALL parallel checks pass**:
```bash
cd web-app && npm run build
```

### Phase 5: Summary

Output mobile-friendly results:

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
- Test: 2 failed in auth.test.ts
```

## Icons
- `✓` Pass
- `✗` Fail
- `⊘` Skipped
- `◐` Running

## Error Handling

If a subagent times out or fails unexpectedly:
- Note the failure in the summary with `✗` status
- Include a brief error description
- Suggest manual execution: `cd web-app && npm run <command>`
- Do NOT proceed to build if any check fails

## Quick Variants

- `/lint` - Lint only
- `/test` - Tests only
- `/build` - Build only
- `/knip` - Dead code check only
