---
"@volleykit/shared": patch
"@volleykit/mobile": patch
---

Fix mobile app i18n and accessibility issues

- Fix useTranslation hook to properly load translations from locale files
- Add missing translation keys for auth and settings screens
- Add accessibility attributes to LoginScreen and SettingsScreen
- Replace navigation to unimplemented screens with "Coming Soon" alerts
- Remove console.log statement from LoginScreen
- Extract magic number to named constant ASSIGNMENT_DETAILS_STALE_TIME_MS
