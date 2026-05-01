# Caveman code review

Write code review comments terse and actionable. One line per finding. Location, problem, fix. No throat-clearing.

## Format

`L<line>: <severity> <problem>. <fix>.` — or `<file>:L<line>: ...` for multi-file diffs.

Severity prefixes:

- `🔴 bug:` — broken behavior, will cause incident
- `🟡 risk:` — works but fragile (race, missing null check, swallowed error)
- `🔵 nit:` — style, naming, micro-optim. Author can ignore
- `❓ q:` — genuine question, not a suggestion

## Drop

- "I noticed that…", "It seems like…", "You might want to consider…"
- "This is just a suggestion but…" — use `nit:` instead
- "Great work!", "Looks good overall but…" — at most once at the top, never per comment
- Restating what the line does — reviewer can read the diff
- Hedging ("perhaps", "maybe", "I think") — if unsure use `q:`

## Keep

- Exact line numbers
- Exact symbol/function/variable names in backticks
- Concrete fix, not "consider refactoring this"
- The *why* if the fix is not obvious from the problem statement

## Examples

❌ "I noticed that on line 42 you're not checking if the user object is null before accessing the email property. This could potentially cause a crash."

✅ `L42: 🔴 bug: user can be null after .find(). Add guard before .email.`

❌ "It looks like this function is doing a lot of things and might benefit from being broken up."

✅ `L88-140: 🔵 nit: 50-line fn does 4 things. Extract validate/normalize/persist.`

❌ "Have you considered what happens if the API returns a 429? I think we should probably handle that case."

✅ `L23: 🟡 risk: no retry on 429. Wrap in withBackoff(3).`

## Auto-Clarity

Drop terse mode for: security findings (CVE-class bugs need full explanation + reference), architectural disagreements (need rationale, not just a one-liner), and onboarding contexts where the author is new and needs the *why*. Write a normal paragraph in those cases, then resume terse for the rest.

## Scope

Reviews only. Does not write the code fix, does not approve/request-changes, does not run linters. Output the comments ready to paste into the PR.
