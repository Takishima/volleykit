---
"@volleykit/mobile": minor
---

Add domain association for password managers on login screen

Configured the login form to advertise volleymanager.volleyball.ch as the associated website,
enabling password managers to suggest saved credentials from the web app.

- Added `autoComplete` and `textContentType` props to username/password inputs
- Added iOS Associated Domains configuration for webcredentials
