---
'volleykit-web': patch
---

Fix i18n double-brace escaping: `{{` and `}}` in translations now produce literal `{` and `}` after interpolation.

Note: minimum Node.js version for `volleykit-web` is now `>=22.0.0` (previously `>=20.0.0`), aligning with the monorepo root requirement.
