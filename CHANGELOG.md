# Changelog

## 1.3.0

### Minor Changes

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Added Changesets for changelog management - changelog entries are now staged as individual files in `.changeset/` directory, eliminating merge conflicts when multiple PRs modify the changelog

### Patch Changes

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Fixed PDF download for compensation statements in PWA mode - the MIME type validation was case-sensitive and failed when servers returned `Application/PDF` or `application/pdf; charset=utf-8` instead of lowercase `application/pdf`

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - PWA auto-refresh after update now works correctly on iOS - previously users experienced "invalid login" errors after automatic updates because stale session tokens and auth state remained in localStorage; now the update process clears session data and uses cache-busting URLs to bypass Safari's aggressive memory cache

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Removed notification settings section from Settings page - notifications can only be generated when the app is open, making them impractical for PWA users who expect notifications when the app is closed

All notable changes to VolleyKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-01-11

### Added

- Unified notification system with automatic fallback - notifications use browser notifications when available and automatically fall back to in-app notifications when browser permissions are denied or unavailable
- Notification settings section in Settings page with single toggle for enabling game reminders and reminder time selection

### Fixed

- OCR POC TypeScript build now resolves React dependencies correctly when importing web-app components (#724)
- Profile picture now displays correctly in PWA Settings page - image URLs are now proxied through the worker to bypass iOS Safari's cross-origin restrictions that blocked images from volleymanager.volleyball.ch in standalone PWA mode
- PWA version detection now properly triggers refresh on iOS - added fallback reload mechanism when service worker is not ready, visibility change handler for app resume from background, and login buttons are disabled until update is applied to prevent authentication with stale code
- PWA login page now shows prominent update banner when a new version is available - previously users could attempt login with stale cached code, causing confusing username/password errors; the banner prompts users to update before logging in
- Compensation update API now sends `__identity` nested inside `convocationCompensation` object, matching the format expected by the VolleyManager API - this fixes 500 errors when saving compensation edits
- Compensation API calls now work correctly when editing from the Assignments tab - the hook was incorrectly using the global `api` object instead of the data-source-aware `getApiClient()`, which could cause issues in calendar mode
- Compensation edits now show error toast when save fails - previously, failed API calls were silently swallowed and the modal closed without feedback (#714)
- Association selection now persists across logout/login - previously, switching associations (e.g., from SVRZ to SV), logging out, and logging back in would show stale data from the previous association while the dropdown displayed the default

## [1.1.1] - 2026-01-11

### Fixed

- Release workflow test failures - SettingsPage test now stubs `__APP_VERSION__` instead of hardcoding version (#710)

## [1.1.0] - 2026-01-11

### Added

- Pull-to-refresh for iOS PWA - assignments page now supports pull-to-refresh gesture when running as installed PWA on iPhone, where native browser refresh is unavailable
- Prettier formatter and consistent import ordering for codebase - works in Claude Code web sessions without devenv (#704)
- `/pr-review` command for Claude Code - creates PR and automatically addresses Claude Code Review comments after 2-minute wait
- Automated release workflow with semantic version auto-detection from changelog
- PWA standalone mode detection - Settings now displays "PWA" instead of "Web" when running as installed app (#687)

### Changed

- OCR POC now displays parsed roster data instead of comparing against dummy data, for debugging OCR recognition issues
- Claude Code `/review` command now includes changelog status check
- CLAUDE.md workflow now explicitly lists changelog update as step 2 before commit
- Definition of Done moved changelog requirement to position 2 with clearer instructions

### Fixed

- Favicon now matches PWA icon for consistent branding across browser tabs and installed app
- iOS Safari PWA update detection - app now checks for updates when reopened after being suspended, ensuring users see the update prompt after quitting and reopening the PWA
- iOS Safari PWA session persistence - session token now encrypted with Web Crypto API (AES-GCM) before storage in localStorage; encryption key stored as non-extractable CryptoKey in IndexedDB
- iOS Safari PWA first login failure - login now proactively establishes a session before fetching the login page form, ensuring the form's CSRF token matches the session state when credentials are submitted (#703)
- iOS Safari PWA login with installed app - session token capture now works via new `X-Capture-Session-Token` header that converts redirect responses to JSON, fixing opaque redirect issue where session tokens were inaccessible (#706)
- iOS Safari PWA login now works reliably with multiple worker-side fixes (#687, #690):
  - Session cookies relayed via `X-Session-Token` header to bypass ITP third-party cookie blocking
  - Query parameters stripped from Referer header to prevent upstream server rejections
  - POST auth redirects converted to JSON responses, fixing `opaqueredirect` issue
  - Broadened successful login detection to match any dashboard redirect path
  - Login success detection now checks for session cookie in redirect responses (fixes root path redirect)
- OCR camera capture now auto-crops images to match the guide overlay, improving OCR accuracy by focusing on the scoresheet area
- User now sees correct assignments after logging into a different association (#697)
- Association dropdown now stays in sync with displayed data after logout and re-login

### Removed

- Automatic PR review hooks (`address-pr-reviews.sh`, `address-pr-reviews-on-create.sh`) - replaced by manual `/pr-review` command

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

[Unreleased]: https://github.com/Takishima/volleykit/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Takishima/volleykit/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/Takishima/volleykit/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Takishima/volleykit/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/Takishima/volleykit/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Takishima/volleykit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Takishima/volleykit/releases/tag/v1.0.0
