# Changelog

All notable changes to VolleyKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Automatic version check with force updates for PWA (#671)
- On-call (Pikett) assignments display in upcoming tab (#661)
- Referee backup (Pikett) API client foundation (#660)
- Daily game badge on PWA app icon (#663)
- New volleyball-themed PWA icons (#664)
- OCR improvements: medical staff role, enhanced validation, Fuse.js name matching (#654, #657)
- Birth date extraction in OCR (#646)
- Expandable raw OCR data panel (#645)
- Mistral API health check endpoint (#650)

### Changed

- Validation moved from pre-push to pre-commit hook (#662)
- PWA icons updated with volleyball design (#664)

### Fixed

- GitHub token handling in hooks requires bash -c wrapper (#673)
- On-call assignments match by person identity (#672)
- Stale session detection in PWA standalone mode (#668)
- Login redirect detection for PWA standalone mode (#665)
- PWA icon green background extends to edges (#666)
- Transport arrival calculation includes walking time (#658)
- OCR loading state shows immediately (#656)
- OCR handles space-separated two-column output (#655)
- Validation wizard is fully read-only in safe mode (#652)
- OCR bounding boxes hidden when not precise (#651)
- Camera app no longer appears in image file picker (#644)

## [1.0.0] - 2025-01-01

### Added

- Initial release of VolleyKit PWA
- Assignment management with calendar sync
- Compensation tracking and editing
- Exchange/swap functionality between referees
- Game validation wizard with roster verification
- Multi-language support (German, English, French, Italian)
- Offline-capable Progressive Web App
- Swiss public transport integration (OJP SDK)
- PDF export for compensations
- Dark mode support
- Onboarding tour for new users

### Security

- CORS proxy via Cloudflare Workers
- Session-based authentication with CSRF protection
- Content Security Policy headers

---

## Version Guidelines

### When to Increment Versions

- **MAJOR (X.0.0)**: Breaking changes that require user action or significantly alter workflows
  - Removing features users depend on
  - Changing authentication flow
  - Major UI redesign that requires relearning

- **MINOR (0.X.0)**: New features that are backwards-compatible
  - New pages or functionality
  - New settings or options
  - Enhancements to existing features

- **PATCH (0.0.X)**: Bug fixes and minor improvements
  - Fixing bugs that don't change behavior
  - Performance improvements
  - Security patches
  - Translation updates

### Changelog Entry Format

Each version section should include relevant subsections:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### Example Entry

```markdown
## [1.2.0] - 2025-02-15

### Added

- Calendar export to Google Calendar and Apple Calendar (#123)
- Push notifications for assignment reminders (#124)

### Changed

- Improved loading performance for assignment list (#125)

### Fixed

- Assignment dates now display correctly in all timezones (#126)
```

[Unreleased]: https://github.com/Takishima/volleykit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Takishima/volleykit/releases/tag/v1.0.0
