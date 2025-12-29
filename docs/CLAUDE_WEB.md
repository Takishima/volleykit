# Claude Code Web Instructions

These instructions apply when working in Claude Code on the web (identified by `claude/*` branch pattern).

## PR Description Generation

When implementation is complete (all changes committed and pushed), automatically generate a PR description for easy copy-paste into GitHub.

### Format Requirements

**CRITICAL**: Use 4-space indented code blocks instead of triple backticks. This avoids markdown rendering issues in the Claude app on mobile.

### PR Description Template

    ## Summary

    [1-3 bullet points describing the changes]

    ## Changes

    - [List of specific changes made]

    ## Test Plan

    - [ ] [Checklist of testing steps]

### Example Output

When you complete work, output something like:

---

**PR Description (copy-paste ready):**

## Summary

- Add user profile editing functionality
- Implement form validation with Zod schemas

## Changes

- Added ProfileEditForm component in src/components/features/profile/
- Created useProfileMutation hook for API integration
- Added translations for all 4 languages

## Code Examples

If showing code in the PR description, indent with 4 spaces:

    function example() {
      return 'This renders correctly';
    }

## Test Plan

- [ ] Verify form validation shows errors for invalid input
- [ ] Test successful profile update flow
- [ ] Check translations in all languages

---
