---
"@volleykit/mobile": patch
---

Auto-submit login form after successful biometric authentication

Previously, biometric authentication would fill in credentials but require a manual tap on the login button. Now, when biometric auth succeeds and retrieves stored credentials, the login is automatically triggered.
