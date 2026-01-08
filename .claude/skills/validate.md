# Validate Skill

Run pre-push validation optimized for mobile (iPhone) development. Uses parallel sub-agents for speed.

## Trigger Phrases

Invoke this skill when user says any of:
- "validate", "validation", "run validation"
- "check before push", "pre-push check"
- "run checks", "run all checks"
- "lint test build", "full check"

## Instructions

When this skill is invoked, perform validation with these steps:

### 1. Quick Change Detection

First, detect what changed to determine required validations. Check both staged and unstaged changes:

```bash
# From project root, detect all uncommitted changes
git diff --name-only          # Unstaged changes
git diff --name-only --cached # Staged changes
git status --porcelain        # All modified/untracked files
```

Categorize changes:
- **Source files**: `*.ts`, `*.tsx`, `*.js`, `*.jsx` → needs full validation
- **OpenAPI spec**: `docs/api/volleymanager-openapi.yaml` → needs generate:api first
- **Test files only**: `*.test.ts`, `*.test.tsx` → needs test only
- **Locale files**: `*.json` in `i18n/locales/` → needs lint only
- **Docs only**: `*.md` files → skip all validation

### 2. Generate API Types (If Needed)

**Run FIRST if OpenAPI spec changed**:

```bash
cd web-app && npm run generate:api
```

This must complete before lint/test/build since they depend on generated types.

### 3. Parallel Validation (Sub-Agents)

**CRITICAL**: Launch these sub-agents IN PARALLEL using a SINGLE message with multiple Task tool calls.

**Validation order per CLAUDE.md**: generate:api → lint → knip → test → build

Lint, knip, and test can run in parallel since they're independent. Build must wait for all to pass.

#### Agent 1: Lint Check
```
subagent_type: "general-purpose"
prompt: |
  Run ESLint in the web-app directory:
  cd web-app && npm run lint

  Return ONLY this format:
  LINT: PASS or LINT: FAIL
  [If fail, include first 5 error lines]
```

#### Agent 2: Dead Code Check
```
subagent_type: "general-purpose"
prompt: |
  Run Knip dead code detection in the web-app directory:
  cd web-app && npm run knip

  Return ONLY this format:
  KNIP: PASS or KNIP: FAIL
  [If fail, include summary of unused exports]
```

#### Agent 3: Test Suite
```
subagent_type: "general-purpose"
prompt: |
  Run Vitest tests in the web-app directory:
  cd web-app && npm test

  Return ONLY this format:
  TEST: PASS (X passed) or TEST: FAIL (X passed, Y failed)
  [If fail, list failed test names only]
```

### 4. Sequential Build (Only if Parallel Checks Pass)

If ALL parallel checks pass, run build:

```bash
cd web-app && npm run build
```

### 5. Mobile-Friendly Summary

Output a concise summary using this exact format:

```
## Validation Results

✓ Lint  ✓ Knip  ✓ Test  ✓ Build

Ready to push!
```

Or on failure:

```
## Validation Results

✓ Lint  ✗ Knip  ✓ Test  ⊘ Build

Issues:
- Knip: 2 unused exports in helpers.ts
```

### Status Icons (Mobile-Optimized)
- `✓` Pass
- `✗` Fail
- `⊘` Skipped
- `◐` Running

### Smart Skip Rules

Skip validations when safe:
- **No source changes**: Skip all (docs/config only)
- **Test files only**: Skip lint, knip, build - run test only
- **Locale JSON only**: Run lint only
- **OpenAPI changes**: Run generate:api before other checks

### Error Handling

If a sub-agent times out or fails unexpectedly:
1. Note the failed check
2. Continue with other results
3. Suggest running the failed check manually

### Example Invocations

User says: "validate" or "check" or "run validation"
→ Run full validation flow above

User says: "quick validate" or "lint only"
→ Run only lint check, skip others

User says: "test only"
→ Run only test suite
