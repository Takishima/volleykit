# Changelog

## 1.8.0

### Patch Changes

- [#799](https://github.com/Takishima/volleykit/pull/799) [`b8290d2`](https://github.com/Takishima/volleykit/commit/b8290d2791412993d1da14f2ca0a783363593db1) Thanks [@Takishima](https://github.com/Takishima)! - Add unit tests for auth-log-buffer utility covering all logging methods, circular buffer behavior, and subscriber notifications

- Updated dependencies [[`56e8d5f`](https://github.com/Takishima/volleykit/commit/56e8d5fe997b16fbca8b26a4b3d4800a750d0319), [`d0c0490`](https://github.com/Takishima/volleykit/commit/d0c0490e716e807a266c5c138e604e2ccea2c23f), [`5840a9f`](https://github.com/Takishima/volleykit/commit/5840a9fc37f95771b481561b20bc82c8ffb64c49)]:
  - @volleykit/shared@1.8.0

## 1.7.0

### Minor Changes

- [#756](https://github.com/Takishima/volleykit/pull/756) [`37c1ca4`](https://github.com/Takishima/volleykit/commit/37c1ca41375377fbb49ef52c86d10e23e1d680f3) Thanks [@Takishima](https://github.com/Takishima)! - Add React Native mobile app foundation with shared code architecture

  **Phase 1: Project Setup**

  - Initialize monorepo workspace structure with packages/shared and packages/mobile
  - Configure npm workspaces and Expo project with TypeScript 5.9
  - Add NativeWind (Tailwind CSS for React Native)

  **Phase 2: Shared Code Architecture**

  - Extract platform-agnostic API client, validation schemas, and query keys to @volleykit/shared
  - Extract TanStack Query hooks (useAssignments, useCompensations, useExchanges)
  - Extract Zustand stores (auth, settings) with platform adapter interfaces
  - Extract i18n translations and date/error helpers
  - Migrate web-app to import from @volleykit/shared (~463 lines removed)

  This enables 70%+ code sharing between the PWA and upcoming native mobile app.

### Patch Changes

- Updated dependencies [[`13845d8`](https://github.com/Takishima/volleykit/commit/13845d859f2207f768e81bfbfaae1dfa653d6ba4)]:
  - @volleykit/shared@1.0.1

## 1.6.0

### Minor Changes

- [#752](https://github.com/Takishima/volleykit/pull/752) [`39db096`](https://github.com/Takishima/volleykit/commit/39db0962725cecdc93c04f574548303f96bce922) Thanks [@Takishima](https://github.com/Takishima)! - Added smart conflict detection that considers venue distance in addition to time gaps. Assignments at nearby venues (within 5km) are no longer flagged as conflicts even with small time gaps, since no travel time is needed. This applies to both the Assignments page conflict warnings and the Exchange page game gap filter.

## 1.5.0

### Minor Changes

- [#744](https://github.com/Takishima/volleykit/pull/744) [`8fd84bc`](https://github.com/Takishima/volleykit/commit/8fd84bc2a4e0b4dc834bd7209857b46b8d6aa56d) Thanks [@Takishima](https://github.com/Takishima)! - Added calendar sync indicator to profile section in settings page to show when calendar parsing is active for conflict detection

- [#748](https://github.com/Takishima/volleykit/pull/748) [`0b8cd7c`](https://github.com/Takishima/volleykit/commit/0b8cd7c6efaec29aff8ccf022d3bb12cfa31f95a) Thanks [@Takishima](https://github.com/Takishima)! - Added game gap filter to exchanges - filter out exchange offers that are too close to your existing assignments

- [#741](https://github.com/Takishima/volleykit/pull/741) [`995d8d5`](https://github.com/Takishima/volleykit/commit/995d8d59162d4e9007eabdd76912cf9690473235) Thanks [@Takishima](https://github.com/Takishima)! - Add assignment conflict detection to warn when games are scheduled too close together

  - Detects assignments less than 1 hour apart using the calendar feed
  - Shows warning indicator on AssignmentCard for conflicting assignments
  - Displays conflict details in expanded view (association, time gap, hall)
  - Works across all associations since calendar contains all assignments
  - Demo mode shows example conflicts for testing
  - Custom evaluator support for location-based or other conflict logic

- [#745](https://github.com/Takishima/volleykit/pull/745) [`26c893f`](https://github.com/Takishima/volleykit/commit/26c893f9e21c755339bafdb8c77cf266c499adee) Thanks [@Takishima](https://github.com/Takishima)! - Extract calendar code from dashboard HTML during login for scheduling conflict detection

- [#747](https://github.com/Takishima/volleykit/pull/747) [`70f7dc9`](https://github.com/Takishima/volleykit/commit/70f7dc9c241b6a3ec5eb998cc081d8fc8e751fbf) Thanks [@Takishima](https://github.com/Takishima)! - Add worker version tracking to preserve login sessions during web-app-only updates

  Previously, any app version update would force users to log out. Now the app tracks the worker (CORS proxy) version separately:

  - Worker version changes → clear session and reload (auth logic may have changed)
  - Web app only changes → reload without clearing session (preserves login)

  This improves user experience by avoiding unnecessary re-logins when only UI/feature changes are deployed.

### Patch Changes

- [#750](https://github.com/Takishima/volleykit/pull/750) [`d34f0bf`](https://github.com/Takishima/volleykit/commit/d34f0bfd861e7a3579020414cbd48f2daf475f89) Thanks [@Takishima](https://github.com/Takishima)! - Use primary app color for calendar sync indicator in settings for better visual consistency

- [#743](https://github.com/Takishima/volleykit/pull/743) [`882d2a7`](https://github.com/Takishima/volleykit/commit/882d2a7d7ae8392c8289ec8cb98d158553cb10d4) Thanks [@Takishima](https://github.com/Takishima)! - Fixed conflict indicators not showing in demo mode - calendar assignment IDs now match the actual demo assignment IDs

- [#742](https://github.com/Takishima/volleykit/pull/742) [`b11de70`](https://github.com/Takishima/volleykit/commit/b11de70e6e7d0a1ba43c385b9ca0ddb7ca9cc1c0) Thanks [@Takishima](https://github.com/Takishima)! - Added pull-to-refresh to Compensations and Exchanges pages for consistent refresh behavior across all main tabs

## 1.4.0

### Minor Changes

- [#738](https://github.com/Takishima/volleykit/pull/738) [`9ee0d4c`](https://github.com/Takishima/volleykit/commit/9ee0d4cee01c3ff19727b5a9f9ac6a766370a2b9) Thanks [@Takishima](https://github.com/Takishima)! - Added GitHub spec-kit integration for spec-driven development workflow with Claude Code slash commands

### Patch Changes

- [#739](https://github.com/Takishima/volleykit/pull/739) [`401ef73`](https://github.com/Takishima/volleykit/commit/401ef734b52d5be3585b78aeeaf9b9316492f650) Thanks [@Takishima](https://github.com/Takishima)! - Improved login experience on iOS PWA when app update is needed:

  - Shows inline "Update Now" button when login fails, suggesting app update may fix the issue
  - Clears stale CSRF tokens when login page loads or app resumes from suspension
  - Added pageshow event fallback for more reliable update detection on iOS PWA

- [#737](https://github.com/Takishima/volleykit/pull/737) [`f9e088b`](https://github.com/Takishima/volleykit/commit/f9e088b7a616e54922f43992fbe5ba6baedc8ea3) Thanks [@Takishima](https://github.com/Takishima)! - Fixed release workflow not extracting changelog entries for GitHub release notes - the sed pattern expected `## [1.3.0]` format but Changesets generates `## 1.3.0` without brackets. Also fixed package-lock.json not being updated during releases by adding `npm install --package-lock-only` after version bump

## 1.3.0

### Minor Changes

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Added Changesets for changelog management - changelog entries are now staged as individual files in `.changeset/` directory, eliminating merge conflicts when multiple PRs modify the changelog

### Patch Changes

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Fixed PDF download for compensation statements in PWA mode - the MIME type validation was case-sensitive and failed when servers returned `Application/PDF` or `application/pdf; charset=utf-8` instead of lowercase `application/pdf`

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - PWA auto-refresh after update now works correctly on iOS - previously users experienced "invalid login" errors after automatic updates because stale session tokens and auth state remained in localStorage; now the update process clears session data and uses cache-busting URLs to bypass Safari's aggressive memory cache

- [#729](https://github.com/Takishima/volleykit/pull/729) [`166bf02`](https://github.com/Takishima/volleykit/commit/166bf0291d5afffd6ef59249226bc17b40c9ac10) Thanks [@Takishima](https://github.com/Takishima)! - Removed notification settings section from Settings page - notifications can only be generated when the app is open, making them impractical for PWA users who expect notifications when the app is closed

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
