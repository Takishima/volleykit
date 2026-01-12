---
"volleykit-web": patch
---

Fixed release workflow not extracting changelog entries for GitHub release notes - the sed pattern expected `## [1.3.0]` format but Changesets generates `## 1.3.0` without brackets
