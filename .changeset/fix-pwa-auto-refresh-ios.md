---
"volleykit-web": patch
---

PWA auto-refresh after update now works correctly on iOS - previously users experienced "invalid login" errors after automatic updates because stale session tokens and auth state remained in localStorage; now the update process clears session data and uses cache-busting URLs to bypass Safari's aggressive memory cache
