---
'volleykit-web': patch
---

Removed dead code paths in the web app: unused notification services and the
matching settings slice, the ineffective cache warming hook, unused components
and hooks that were only reachable from feature barrel files, and duplicated
request/body construction in the API clients. No user-facing behavior changes.
