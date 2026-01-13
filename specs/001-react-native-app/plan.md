# Implementation Plan: React Native Mobile App

**Branch**: `001-react-native-app` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-react-native-app/spec.md`

## Summary

Build a React Native mobile app for iOS and Android that shares code with the existing PWA. The app provides native features (biometric login, calendar integration, widgets) while reusing business logic, API clients, state management, and translations from the web app. Priority is on code sharing (70%+ target) over feature complexity.

## Technical Context

**Language/Version**: TypeScript 5.9, React Native 0.76+ (New Architecture)
**Primary Dependencies**: React Native, TanStack Query 5, Zustand 5, Zod 4, date-fns 4, expo-secure-store, expo-calendar, react-native-widgetkit
**Storage**: AsyncStorage (replacing localStorage), Secure Enclave/Keystore for credentials
**Testing**: Jest + React Native Testing Library (unit), Detox (E2E)
**Target Platform**: iOS 15+, Android SDK 24+ (Android 7.0+)
**Project Type**: Mobile (monorepo with shared packages)
**Performance Goals**: <3s cold start, <3s biometric re-auth
**Constraints**: 15-30min session tokens, no background auth, offline read-only
**Scale/Scope**: Single user app, ~10 screens matching PWA

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project-specific constitution defined. Following standard practices:
- [x] Code sharing between platforms (FR-025)
- [x] Platform-specific implementations isolated (FR-026)
- [x] Monorepo structure maintained (FR-027)
- [x] TypeScript for type safety
- [x] Test coverage for shared code

## Project Structure

### Documentation (this feature)

```text
specs/001-react-native-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Monorepo with shared packages
packages/
├── shared/                    # Shared code (70%+ of logic)
│   ├── api/                   # API client, types, validation
│   │   ├── client.ts          # Platform-agnostic fetch wrapper
│   │   ├── schema.ts          # Generated OpenAPI types
│   │   ├── validation.ts      # Zod schemas
│   │   └── queryKeys.ts       # TanStack Query keys
│   ├── stores/                # Zustand stores (platform-agnostic)
│   │   ├── auth.ts            # Auth state (no persist middleware)
│   │   ├── settings.ts        # User preferences
│   │   └── demo.ts            # Demo mode
│   ├── hooks/                 # Shared React hooks
│   │   ├── useAssignments.ts
│   │   ├── useCompensations.ts
│   │   └── useExchanges.ts
│   ├── utils/                 # Pure utility functions
│   │   ├── date-helpers.ts
│   │   ├── assignment-helpers.ts
│   │   └── error-helpers.ts
│   ├── i18n/                  # Translations
│   │   ├── types.ts
│   │   └── locales/
│   └── types/                 # Shared TypeScript types
│
├── web/                       # PWA-specific code (replaces web-app/)
│   ├── src/
│   │   ├── platform/          # Web-specific implementations
│   │   │   ├── storage.ts     # localStorage wrapper
│   │   │   └── auth.ts        # Web auth flow
│   │   ├── components/        # Web-only components
│   │   └── App.tsx
│   └── vite.config.ts
│
└── mobile/                    # React Native app
    ├── src/
    │   ├── platform/          # Native-specific implementations
    │   │   ├── storage.ts     # AsyncStorage + SecureStore
    │   │   ├── biometrics.ts  # Face ID/Touch ID/fingerprint
    │   │   ├── calendar.ts    # Native calendar integration
    │   │   └── widgets/       # Home screen widgets
    │   ├── screens/           # Screen components
    │   ├── navigation/        # React Navigation setup
    │   └── App.tsx
    ├── ios/                   # iOS native code
    ├── android/               # Android native code
    └── app.json               # Expo/RN config
```

**Structure Decision**: Monorepo with `packages/` directory. Extract shareable code from `web-app/src/` into `packages/shared/`. Platform-specific code lives in `packages/web/` and `packages/mobile/`.

## Complexity Tracking

No constitution violations to justify.

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Decisions

1. **React Native Framework**: Expo (managed workflow) with prebuild for native modules
2. **Code Sharing Strategy**: Package extraction with platform-specific adapters
3. **State Persistence**: Zustand without persist middleware, platform adapters handle storage
4. **Biometric Library**: expo-secure-store with expo-local-authentication
5. **Calendar Integration**: expo-calendar for direct events, URL scheme for iCal subscription
6. **Widget Library**: react-native-widgetkit (iOS), react-native-android-widget (Android)
7. **Navigation**: React Navigation 6 with native stack

### Architecture Patterns

1. **Platform Abstraction**: Interface-based adapters for storage, auth, calendar
2. **Dependency Injection**: Platform implementations injected at app root
3. **Feature Flags**: Build-time flags to exclude web-only features from mobile bundle

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md) - Entity definitions and relationships
- [quickstart.md](./quickstart.md) - Developer setup guide
- [contracts/](./contracts/) - API contracts (reusing existing OpenAPI spec)

## Next Steps

Run `/speckit.tasks` to generate the implementation task list.
