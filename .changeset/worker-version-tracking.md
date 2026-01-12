---
"volleykit-web": minor
---

Add worker version tracking to preserve login sessions during web-app-only updates

Previously, any app version update would force users to log out. Now the app tracks the worker (CORS proxy) version separately:
- Worker version changes → clear session and reload (auth logic may have changed)
- Web app only changes → reload without clearing session (preserves login)

This improves user experience by avoiding unnecessary re-logins when only UI/feature changes are deployed.
