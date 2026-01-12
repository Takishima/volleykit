---
"volleykit-web": patch
---

Improved login experience on iOS PWA when app update is needed:
- Shows inline "Update Now" button when login fails, suggesting app update may fix the issue
- Clears stale CSRF tokens when login page loads or app resumes from suspension
- Added pageshow event fallback for more reliable update detection on iOS PWA
