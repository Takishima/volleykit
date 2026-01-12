---
"volleykit-web": patch
---

Fixed PDF download for compensation statements in PWA mode - the MIME type validation was case-sensitive and failed when servers returned `Application/PDF` or `application/pdf; charset=utf-8` instead of lowercase `application/pdf`
