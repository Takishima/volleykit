# @volleykit/mobile

## 1.8.0

### Minor Changes

- [#760](https://github.com/Takishima/volleykit/pull/760) [`c2a8218`](https://github.com/Takishima/volleykit/commit/c2a8218efbf5940979a4966366bd2bd2c5cbcc18) Thanks [@Takishima](https://github.com/Takishima)! - Add biometric authentication for quick re-login

  - Secure credential storage using device Keychain/Keystore via expo-secure-store
  - Face ID, Touch ID, and fingerprint authentication support via expo-local-authentication
  - Biometric settings screen to enable/disable the feature
  - Session monitoring with automatic biometric re-auth prompt on session expiry
  - Password fallback after 3 failed biometric attempts
  - BiometricPrompt component for re-authentication UI

- [#790](https://github.com/Takishima/volleykit/pull/790) [`6cb34c5`](https://github.com/Takishima/volleykit/commit/6cb34c5023e364a1355c746c0aab2db0b0c8c7d7) Thanks [@Takishima](https://github.com/Takishima)! - Add domain association for password managers on login screen

  Configured the login form to advertise volleymanager.volleyball.ch as the associated website,
  enabling password managers to suggest saved credentials from the web app.

  - Added `autoComplete` and `textContentType` props to username/password inputs
  - Added iOS Associated Domains configuration for webcredentials

- [#778](https://github.com/Takishima/volleykit/pull/778) [`923ab09`](https://github.com/Takishima/volleykit/commit/923ab09ded600b126f11600ba093d94230253c24) Thanks [@Takishima](https://github.com/Takishima)! - Implement real API client for mobile app, replacing mock data with actual backend API calls when authenticated

### Patch Changes

- [#770](https://github.com/Takishima/volleykit/pull/770) [`9d5309c`](https://github.com/Takishima/volleykit/commit/9d5309cb6e2f65860f77ddd38bfccea8ac4f3f19) Thanks [@Takishima](https://github.com/Takishima)! - Add status display with i18n translations to AssignmentsScreen for consistency with other list screens

- [#766](https://github.com/Takishima/volleykit/pull/766) [`5f20cdc`](https://github.com/Takishima/volleykit/commit/5f20cdca135d26f390f3ffb641cd57f8f96ea3b3) Thanks [@Takishima](https://github.com/Takishima)! - Auto-submit login form after successful biometric authentication

  Previously, biometric authentication would fill in credentials but require a manual tap on the login button. Now, when biometric auth succeeds and retrieves stored credentials, the login is automatically triggered.

- [#764](https://github.com/Takishima/volleykit/pull/764) [`a19ade7`](https://github.com/Takishima/volleykit/commit/a19ade7de1404a4aa4002a17a0b65a2cb13170eb) Thanks [@Takishima](https://github.com/Takishima)! - Implement calendar sync with useCalendarSync hook

  - Integrate useCalendarSync hook into CalendarSettingsScreen for actual sync functionality
  - Display sync summary showing created/updated/deleted calendar events after sync
  - Handle case when no assignments are cached with user-friendly error message
  - Add translations for new sync-related UI strings in all 4 languages

- [#794](https://github.com/Takishima/volleykit/pull/794) [`56e8d5f`](https://github.com/Takishima/volleykit/commit/56e8d5fe997b16fbca8b26a4b3d4800a750d0319) Thanks [@Takishima](https://github.com/Takishima)! - Add missing i18n translations for DepartureReminderSettingsScreen

  - Add translation keys for background location and notification permission denied messages
  - Add translation keys for "How it works" section
  - Replace hardcoded English strings with proper t() function calls
  - Add translations for all 4 languages (de, en, fr, it)

- [#771](https://github.com/Takishima/volleykit/pull/771) [`d0c0490`](https://github.com/Takishima/volleykit/commit/d0c0490e716e807a266c5c138e604e2ccea2c23f) Thanks [@Takishima](https://github.com/Takishima)! - Use i18n translations in AssignmentDetailScreen instead of hardcoded English text

- [#767](https://github.com/Takishima/volleykit/pull/767) [`3a6b0f4`](https://github.com/Takishima/volleykit/commit/3a6b0f45f4305bfc339ca6e4e0072275c4860d75) Thanks [@Takishima](https://github.com/Takishima)! - Fix mobile screens to use i18n translations for status labels instead of hardcoded English strings

- [#789](https://github.com/Takishima/volleykit/pull/789) [`5840a9f`](https://github.com/Takishima/volleykit/commit/5840a9fc37f95771b481561b20bc82c8ffb64c49) Thanks [@Takishima](https://github.com/Takishima)! - Use i18n translations for LastUpdatedIndicator hardcoded strings

- [#760](https://github.com/Takishima/volleykit/pull/760) [`c2a8218`](https://github.com/Takishima/volleykit/commit/c2a8218efbf5940979a4966366bd2bd2c5cbcc18) Thanks [@Takishima](https://github.com/Takishima)! - Add GitHub Actions CI workflow for mobile package with lint and test jobs

- Updated dependencies [[`56e8d5f`](https://github.com/Takishima/volleykit/commit/56e8d5fe997b16fbca8b26a4b3d4800a750d0319), [`d0c0490`](https://github.com/Takishima/volleykit/commit/d0c0490e716e807a266c5c138e604e2ccea2c23f), [`5840a9f`](https://github.com/Takishima/volleykit/commit/5840a9fc37f95771b481561b20bc82c8ffb64c49)]:
  - @volleykit/shared@1.8.0

## 1.0.1

### Patch Changes

- [#754](https://github.com/Takishima/volleykit/pull/754) [`13845d8`](https://github.com/Takishima/volleykit/commit/13845d859f2207f768e81bfbfaae1dfa653d6ba4) Thanks [@Takishima](https://github.com/Takishima)! - Fix mobile app i18n and accessibility issues

  - Fix useTranslation hook to properly load translations from locale files
  - Add missing translation keys for auth and settings screens
  - Add accessibility attributes to LoginScreen and SettingsScreen
  - Replace navigation to unimplemented screens with "Coming Soon" alerts
  - Remove console.log statement from LoginScreen
  - Extract magic number to named constant ASSIGNMENT_DETAILS_STALE_TIME_MS

- Updated dependencies [[`13845d8`](https://github.com/Takishima/volleykit/commit/13845d859f2207f768e81bfbfaae1dfa653d6ba4)]:
  - @volleykit/shared@1.0.1
