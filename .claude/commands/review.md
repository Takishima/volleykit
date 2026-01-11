Read these files first:
- docs/SECURITY_CHECKLIST.md
- docs/CODE_PATTERNS.md
- CHANGELOG.md (check if updates are needed)

Then review the current uncommitted changes (use `git diff`) for:

1. **Security issues** - Check against the security checklist
2. **Anti-patterns** - Magic numbers, array index keys, memory leaks, race conditions
3. **Code style** - Naming conventions, function length, self-documenting code
4. **Accessibility** - ARIA attributes, keyboard navigation
5. **Missing tests** - Business logic should have test coverage
6. **Changelog** - New features (feat:), bug fixes (fix:), breaking changes need changelog entries

Format your review as:

## Review Summary
[1-2 sentences]

## Issues Found
[List with file:line references, or "None"]

## Changelog Status
[✓ Updated | ⚠️ Needs update: describe what entry to add | N/A (docs only)]

## Recommendations
[Optional improvements]
