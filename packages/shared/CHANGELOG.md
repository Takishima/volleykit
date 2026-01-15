# @volleykit/shared

## 1.0.1

### Patch Changes

- [#754](https://github.com/Takishima/volleykit/pull/754) [`13845d8`](https://github.com/Takishima/volleykit/commit/13845d859f2207f768e81bfbfaae1dfa653d6ba4) Thanks [@Takishima](https://github.com/Takishima)! - Fix mobile app i18n and accessibility issues

  - Fix useTranslation hook to properly load translations from locale files
  - Add missing translation keys for auth and settings screens
  - Add accessibility attributes to LoginScreen and SettingsScreen
  - Replace navigation to unimplemented screens with "Coming Soon" alerts
  - Remove console.log statement from LoginScreen
  - Extract magic number to named constant ASSIGNMENT_DETAILS_STALE_TIME_MS
