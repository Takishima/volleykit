---
'volleykit-web': patch
'@volleykit/shared': patch
'@volleykit/mobile': patch
'volleykit-help': patch
---

Tightened static analysis across the monorepo: type-aware ESLint rules, test files
now type-checked, oxlint pre-pass, stricter TypeScript flags, the native
TypeScript 7 compiler for typecheck and build, dead-code and lint
coverage for the worker and help site, and pinned, least-privilege GitHub workflows.
