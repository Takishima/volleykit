---
"volleykit-web": minor
---

Add React Native mobile app foundation with shared code architecture

**Phase 1: Project Setup**
- Initialize monorepo workspace structure with packages/shared and packages/mobile
- Configure npm workspaces and Expo project with TypeScript 5.9
- Add NativeWind (Tailwind CSS for React Native)

**Phase 2: Shared Code Architecture**
- Extract platform-agnostic API client, validation schemas, and query keys to @volleykit/shared
- Extract TanStack Query hooks (useAssignments, useCompensations, useExchanges)
- Extract Zustand stores (auth, settings) with platform adapter interfaces
- Extract i18n translations and date/error helpers
- Migrate web-app to import from @volleykit/shared (~463 lines removed)

This enables 70%+ code sharing between the PWA and upcoming native mobile app.
