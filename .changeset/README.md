# Changelog Staging

This directory contains changelog entries staged for the next release.

## Adding a Changeset

When making changes that should be documented in the changelog, create a changeset:

```bash
npx changeset
```

This will prompt you to:
1. Select the version bump type (major/minor/patch)
2. Write a description of your changes

The description should be user-facing (what users will notice, not implementation details).

## Version Bump Guidelines

- **patch**: Bug fixes, performance improvements, internal refactoring
- **minor**: New features, enhancements (backwards-compatible)
- **major**: Breaking changes that require user action

## Fragment Format

Changesets are stored as markdown files with YAML front matter:

```markdown
---
"volleykit-web": minor
---

Added calendar export to Google Calendar and Apple Calendar
```

## At Release Time

The release workflow automatically:
1. Combines all changesets into CHANGELOG.md
2. Bumps the version in package.json
3. Deletes the changeset files
4. Creates a git tag and GitHub release
