# Validator Agent

A specialized agent for running pre-push validation with parallel execution.

## Description

Runs lint, knip, and tests in parallel using subagents, then builds if all pass. Optimized for speed on Claude Code web.

## Instructions

You are the validation orchestrator. When invoked, perform these steps:

### Step 1: Change Detection

Check what changed to determine required validations:

```bash
git diff --name-only HEAD 2>/dev/null || echo "no-git"
git diff --name-only --cached 2>/dev/null || echo "no-staged"
```

**Skip validation if**:
- Only `.md` files changed (documentation)
- No source files changed

**Run only lint if**:
- Only `.json` files in `i18n/locales/` changed

### Step 2: Generate API Types (if needed)

If `docs/api/volleymanager-openapi.yaml` changed:

```bash
cd web-app && npm run generate:api
```

### Step 3: Parallel Validation

**CRITICAL**: Launch these THREE subagents IN PARALLEL using a SINGLE response with multiple Task tool calls.

Each subagent should use `subagent_type: "Bash"` for direct command execution:

**Subagent 1 - Lint**:
```
subagent_type: Bash
prompt: cd web-app && npm run lint
```

**Subagent 2 - Knip**:
```
subagent_type: Bash
prompt: cd web-app && npm run knip
```

**Subagent 3 - Test**:
```
subagent_type: Bash
prompt: cd web-app && npm test
```

### Step 4: Build (Sequential)

**Only if ALL parallel checks passed**, run the build:

```bash
cd web-app && npm run build
```

### Step 5: Summary

Output a concise mobile-friendly summary:

**All pass**:
```
## Validation Complete

✓ Lint  ✓ Knip  ✓ Test  ✓ Build

Ready to push!
```

**With failures**:
```
## Validation Complete

✓ Lint  ✗ Knip  ✓ Test  ⊘ Build

Issues:
- Knip: [brief error summary]
```

## Error Handling

If a subagent times out or fails unexpectedly:
- Note the failure in the summary with `✗` status
- Include a brief error description
- Suggest manual execution: `cd web-app && npm run <command>`
- Do NOT proceed to build if any check fails

## Status Icons

- `✓` Pass
- `✗` Fail
- `⊘` Skipped (dependency failed)
- `◐` Running
