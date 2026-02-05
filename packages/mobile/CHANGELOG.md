# @volleykit/mobile

## 1.15.0

### Patch Changes

- [#901](https://github.com/Takishima/volleykit/pull/901) [`4d8bd1b`](https://github.com/Takishima/volleykit/commit/4d8bd1b28cf47b25db5ed72e93cff43862357fa1) Thanks [@Takishima](https://github.com/Takishima)! - Use i18n translation for LoadingScreen loading text

  Replace hardcoded "Loading..." text with `t('common.loading')` to support all 4 languages (de, en, fr, it).

## 1.14.0

### Minor Changes

- [#894](https://github.com/Takishima/volleykit/pull/894) [`1f875f9`](https://github.com/Takishima/volleykit/commit/1f875f994749ca21ad65957c6aa6a29aeedfa415) Thanks [@Takishima](https://github.com/Takishima)! - Add comprehensive offline mode support with action queue for mobile app
  - Add offline action queue system using AsyncStorage for persistent storage
  - Support queuing mutations (updateCompensation, applyForExchange, addToExchange, removeOwnExchange) when offline
  - Automatically sync pending actions when connectivity is restored
  - Add PendingActionsIndicator component showing pending action count in header
  - Add missing API mutation methods (applyForExchange, removeOwnExchange, updateCompensation)
  - Add offline-related translations for all 4 languages (de/en/fr/it)
  - Clear action queue on logout

- [#898](https://github.com/Takishima/volleykit/pull/898) [`8014c8e`](https://github.com/Takishima/volleykit/commit/8014c8e3cc7c696ee9a5a94a17b43b6536f14d7f) Thanks [@Takishima](https://github.com/Takishima)! - Add toast notifications for offline action sync failures

  Users now see visual feedback when offline actions fail to sync:
  - Success toast when actions sync successfully
  - Error toast when sync fails with count of failed actions
  - Warning toast when session expires during sync

### Patch Changes

- [#884](https://github.com/Takishima/volleykit/pull/884) [`a2408a5`](https://github.com/Takishima/volleykit/commit/a2408a5a5f0d452aa3e6b8eaa5e207b0cadd0b22) Thanks [@Takishima](https://github.com/Takishima)! - Remove debug console.log statements from background-task.ts

- [#897](https://github.com/Takishima/volleykit/pull/897) [`f71fff3`](https://github.com/Takishima/volleykit/commit/f71fff30ddc3fa1750d7e4eb095cd8eef8694d7e) Thanks [@Takishima](https://github.com/Takishima)! - Show alert notifications when offline sync fails
  - Display alert dialog when some changes fail to sync after reconnecting
  - Display alert dialog for critical sync errors (unexpected exceptions)
  - Add `offline.syncError` translation key for critical sync failure messages

- Updated dependencies [[`1f875f9`](https://github.com/Takishima/volleykit/commit/1f875f994749ca21ad65957c6aa6a29aeedfa415), [`f71fff3`](https://github.com/Takishima/volleykit/commit/f71fff30ddc3fa1750d7e4eb095cd8eef8694d7e)]:
  - @volleykit/shared@1.14.0

## 1.13.0

### Patch Changes

- [#872](https://github.com/Takishima/volleykit/pull/872) [`676ab00`](https://github.com/Takishima/volleykit/commit/676ab00e71a2fc1d39d6f2f10ea02c354d866753) Thanks [@Takishima](https://github.com/Takishima)! - Use dynamic dates in mock API client for demo mode

  The mobile app's mock API client now generates dates relative to the current date instead of using hardcoded dates. This ensures demo mode always shows realistic "upcoming" and "past" assignments, exchanges, and compensations.

- Updated dependencies [[`36041a5`](https://github.com/Takishima/volleykit/commit/36041a5e0fdc2d0aa93375a81c6523ac963f6639)]:
  - @volleykit/shared@1.13.0

## 1.12.1

### Patch Changes

- [#858](https://github.com/Takishima/volleykit/pull/858) [`aaa767d`](https://github.com/Takishima/volleykit/commit/aaa767d770adfbe3ffd4f19b6e424087210dd7fc) Thanks [@Takishima](https://github.com/Takishima)! - Fix biometric type mapping to correctly distinguish iOS Touch ID from Android fingerprint using platform detection

- [#849](https://github.com/Takishima/volleykit/pull/849) [`645313b`](https://github.com/Takishima/volleykit/commit/645313b4839e6ac0513f891d53409a2d80c1c9a2) Thanks [@Takishima](https://github.com/Takishima)! - Fix expo doctor configuration issues: add missing assets, update dependencies to match Expo SDK 54, resolve duplicate native module versions

- Updated dependencies [[`a521870`](https://github.com/Takishima/volleykit/commit/a52187065f5703c77f7eba0252210e68d98634f4)]:
  - @volleykit/shared@1.12.1

## 1.12.0

### Minor Changes

- [#826](https://github.com/Takishima/volleykit/pull/826) [`107ef41`](https://github.com/Takishima/volleykit/commit/107ef4183df2c669e90d08b55ffce57b684ffc0d) Thanks [@Takishima](https://github.com/Takishima)! - Added addToExchange endpoint and UI integration for posting assignments to the exchange marketplace

### Patch Changes

- [#832](https://github.com/Takishima/volleykit/pull/832) [`5a962ae`](https://github.com/Takishima/volleykit/commit/5a962ae990d2e3f873b1dd007b9b5233265c6681) Thanks [@Takishima](https://github.com/Takishima)! - Add missing expo-router dependency required for EAS builds

- Updated dependencies [[`317ea10`](https://github.com/Takishima/volleykit/commit/317ea109b07b03768337f3ee5e311dea8ad85f34)]:
  - @volleykit/shared@1.12.0

## 1.10.0

### Minor Changes

- [#814](https://github.com/Takishima/volleykit/pull/814) [`d5a9361`](https://github.com/Takishima/volleykit/commit/d5a9361ee5c2d0b03797f4936e431d9bbdeb4275) Thanks [@Takishima](https://github.com/Takishima)! - Add ESLint with sonarjs, import-x, and security plugins, plus Knip for dead code detection

- [#811](https://github.com/Takishima/volleykit/pull/811) [`66e5480`](https://github.com/Takishima/volleykit/commit/66e5480efcc9346ad26ffc78d5903c59cc0ae0e6) Thanks [@Takishima](https://github.com/Takishima)! - Upgrade to Expo SDK 54 with React Native 0.81.5
  - Upgraded Expo SDK from 53 to 54
  - Upgraded React Native from 0.79.0 to 0.81.5
  - Upgraded React from 19.0.0 to 19.1.0
  - Updated all expo-\* packages to SDK 54 compatible versions
  - Added npm overrides for jsdom and @xmldom/xmldom to reduce deprecation warnings

- [#808](https://github.com/Takishima/volleykit/pull/808) [`b1f31f7`](https://github.com/Takishima/volleykit/commit/b1f31f79b3d1e55de71fcf90c0c04208ddb53733) Thanks [@Takishima](https://github.com/Takishima)! - Complete mobile app testing readiness fixes: tappable assignment items with navigation, fully implemented AssignmentDetailScreen, dynamic iCal URL using calendar code, NetworkProvider integration for offline detection, and global OfflineBanner component

### Patch Changes

- [#816](https://github.com/Takishima/volleykit/pull/816) [`efe569d`](https://github.com/Takishima/volleykit/commit/efe569d48adc9243a8fc232c9298c842cfc841d8) Thanks [@Takishima](https://github.com/Takishima)! - Fix version mismatch between app.json and package.json (1.0.1 → 1.8.0)

- Updated dependencies [[`b1f31f7`](https://github.com/Takishima/volleykit/commit/b1f31f79b3d1e55de71fcf90c0c04208ddb53733)]:
  - @volleykit/shared@1.10.0

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
