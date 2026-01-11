# Changelog

All notable changes to VolleyKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Automated release workflow with semantic version auto-detection from changelog
- PWA standalone mode detection - Settings now displays "PWA" instead of "Web" when running as installed app (#687)

### Changed

- OCR POC now displays parsed roster data instead of comparing against dummy data, for debugging OCR recognition issues
- Claude Code `/review` command now includes changelog status check
- CLAUDE.md workflow now explicitly lists changelog update as step 2 before commit
- Definition of Done moved changelog requirement to position 2 with clearer instructions

### Fixed

- iOS Safari PWA update detection - app now checks for updates when reopened after being suspended, ensuring users see the update prompt after quitting and reopening the PWA
- iOS Safari PWA session persistence - session token now stored in localStorage to survive PWA restarts
- iOS Safari PWA login now works reliably with multiple worker-side fixes (#687, #690):
  - Session cookies relayed via `X-Session-Token` header to bypass ITP third-party cookie blocking
  - Query parameters stripped from Referer header to prevent upstream server rejections
  - POST auth redirects converted to JSON responses, fixing `opaqueredirect` issue
  - Broadened successful login detection to match any dashboard redirect path
  - Login success detection now checks for session cookie in redirect responses (fixes root path redirect)
- OCR camera capture now auto-crops images to match the guide overlay, improving OCR accuracy by focusing on the scoresheet area
- User now sees correct assignments after logging into a different association (#697)

## [1.0.2] - 2026-01-10

### Changed

- On-call card now displays date and time (16:00 weekdays, 12:00 weekends) in the same format as regular assignment cards (#676)

## [1.0.1] - 2026-01-10

### Fixed

- On-call assignments not appearing in production due to Zod validation rejecting null `originId` values (#675)
- On-call assignment dates normalized to 12:00 noon for consistent display with game assignments (#675)

## [1.0.0] - 2025-01-10

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

### Security

- CORS proxy via Cloudflare Workers
- Session-based authentication with CSRF protection
- Content Security Policy headers

[Unreleased]: https://github.com/Takishima/volleykit/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/Takishima/volleykit/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Takishima/volleykit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Takishima/volleykit/releases/tag/v1.0.0
