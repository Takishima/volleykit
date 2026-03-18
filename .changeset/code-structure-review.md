---
'volleykit-web': minor
'@volleykit/shared': minor
---

Improve code structure and separation of concerns across the monorepo

- Extract exchange filtering logic into dedicated useExchangeFilters hook
- Unify web and mobile toast stores into shared package with createToastStore factory
- Split web auth store: extract calendar auth service and persistence configuration
- Split worker monolith (1,273 lines) into route handler modules with shared middleware
- Decompose useValidateGameWizard into wizard-steps utils and useValidationSubmit hook
- Decompose useCompensationForm into compensation-cache utils and useCompensationData hook
- Extract SwipeableCardActions component from SwipeableCard
