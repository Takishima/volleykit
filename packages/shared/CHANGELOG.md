# @volleykit/shared

## 1.12.1

### Patch Changes

- [#861](https://github.com/Takishima/volleykit/pull/861) [`a521870`](https://github.com/Takishima/volleykit/commit/a52187065f5703c77f7eba0252210e68d98634f4) Thanks [@Takishima](https://github.com/Takishima)! - Add toggleDemoMode convenience method to demo store

## 1.12.0

### Patch Changes

- [#830](https://github.com/Takishima/volleykit/pull/830) [`317ea10`](https://github.com/Takishima/volleykit/commit/317ea109b07b03768337f3ee5e311dea8ad85f34) Thanks [@Takishima](https://github.com/Takishima)! - Add MS_PER_DAY constant to date-helpers for time conversion consistency

  Added `MS_PER_DAY` constant (86400000 milliseconds) to the shared date-helpers module, completing the set of time conversion constants. Updated mobile app to use shared constants (`MS_PER_MINUTE`, `MS_PER_HOUR`, `MS_PER_DAY`) instead of inline magic numbers for improved code readability and maintainability.

## 1.11.0

### Minor Changes

- [#825](https://github.com/Takishima/volleykit/pull/825) [`72856fc`](https://github.com/Takishima/volleykit/commit/72856fc9b94780c052d0ca836891017e5493d73d) Thanks [@Takishima](https://github.com/Takishima)! - Add pickFromRefereeGameExchange endpoint for exchange takeover
  - Add PUT endpoint to OpenAPI spec for taking over referee assignments from the exchange
  - Update `applyForExchange` API method to use the confirmed endpoint
  - Add `PickExchangeResponse` type for the API response

## 1.10.0

### Patch Changes

- [#808](https://github.com/Takishima/volleykit/pull/808) [`b1f31f7`](https://github.com/Takishima/volleykit/commit/b1f31f79b3d1e55de71fcf90c0c04208ddb53733) Thanks [@Takishima](https://github.com/Takishima)! - Complete mobile app testing readiness fixes: tappable assignment items with navigation, fully implemented AssignmentDetailScreen, dynamic iCal URL using calendar code, NetworkProvider integration for offline detection, and global OfflineBanner component

## 1.8.0

### Patch Changes

- [#794](https://github.com/Takishima/volleykit/pull/794) [`56e8d5f`](https://github.com/Takishima/volleykit/commit/56e8d5fe997b16fbca8b26a4b3d4800a750d0319) Thanks [@Takishima](https://github.com/Takishima)! - Add missing i18n translations for DepartureReminderSettingsScreen
  - Add translation keys for background location and notification permission denied messages
  - Add translation keys for "How it works" section
  - Replace hardcoded English strings with proper t() function calls
  - Add translations for all 4 languages (de, en, fr, it)

- [#771](https://github.com/Takishima/volleykit/pull/771) [`d0c0490`](https://github.com/Takishima/volleykit/commit/d0c0490e716e807a266c5c138e604e2ccea2c23f) Thanks [@Takishima](https://github.com/Takishima)! - Use i18n translations in AssignmentDetailScreen instead of hardcoded English text

- [#789](https://github.com/Takishima/volleykit/pull/789) [`5840a9f`](https://github.com/Takishima/volleykit/commit/5840a9fc37f95771b481561b20bc82c8ffb64c49) Thanks [@Takishima](https://github.com/Takishima)! - Use i18n translations for LastUpdatedIndicator hardcoded strings

## 1.0.1

### Patch Changes

- [#754](https://github.com/Takishima/volleykit/pull/754) [`13845d8`](https://github.com/Takishima/volleykit/commit/13845d859f2207f768e81bfbfaae1dfa653d6ba4) Thanks [@Takishima](https://github.com/Takishima)! - Fix mobile app i18n and accessibility issues
  - Fix useTranslation hook to properly load translations from locale files
  - Add missing translation keys for auth and settings screens
  - Add accessibility attributes to LoginScreen and SettingsScreen
  - Replace navigation to unimplemented screens with "Coming Soon" alerts
  - Remove console.log statement from LoginScreen
  - Extract magic number to named constant ASSIGNMENT_DETAILS_STALE_TIME_MS
