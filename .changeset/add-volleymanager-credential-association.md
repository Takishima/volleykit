---
"volleykit-web": minor
---

Associate PWA login with volleymanager.volleyball.ch for password managers

Added credential association hints to the PWA login form so that password managers
(1Password, Bitwarden, browser autofill, etc.) will suggest volleymanager.volleyball.ch
credentials when logging in to the PWA. This mirrors the native app's iOS `associatedDomains`
and Android credential association behavior.

Changes:
- Added `action="https://volleymanager.volleyball.ch"` to the login form
- Added `name` attributes to username and password inputs
