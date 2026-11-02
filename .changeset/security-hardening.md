---
'volleykit-web': patch
---

Security hardening: ship a Content-Security-Policy with the app shell, only cache JSON API routes in the service worker and drop them on logout, and never persist the iOS session token in plaintext. iOS PWA users whose session token was stored in plaintext by an earlier version are logged out once and need to sign in again.
