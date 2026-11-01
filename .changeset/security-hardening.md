---
'volleykit-web': patch
---

Security hardening: ship a Content-Security-Policy with the app shell, only cache JSON API routes in the service worker and drop them on logout, and never persist the iOS session token in plaintext.
