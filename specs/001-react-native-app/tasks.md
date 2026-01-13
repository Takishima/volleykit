# Tasks: React Native Mobile App

**Input**: Design documents from `/specs/001-react-native-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Tasks focus on implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md monorepo structure:
- **Shared package**: `packages/shared/`
- **Mobile app**: `packages/mobile/`
- **Web app**: `packages/web/` (existing web-app/ renamed)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize monorepo structure and Expo project

- [ ] T001 Create monorepo workspace structure with `packages/shared/`, `packages/web/`, `packages/mobile/` directories
- [ ] T002 Initialize npm workspaces in root `package.json` with workspace configuration
- [ ] T003 [P] Create Expo project in `packages/mobile/` using `npx create-expo-app --template expo-template-blank-typescript`
- [ ] T004 [P] Configure TypeScript 5.9 in `packages/shared/tsconfig.json` with strict mode
- [ ] T005 [P] Configure TypeScript 5.9 in `packages/mobile/tsconfig.json` extending shared config
- [ ] T006 [P] Add ESLint configuration in `packages/mobile/.eslintrc.js` matching web-app patterns
- [ ] T007 Configure Expo prebuild for native modules in `packages/mobile/app.json`
- [ ] T008 [P] Add NativeWind (Tailwind CSS for RN) to `packages/mobile/package.json` and configure
- [ ] T009 [P] Create `.env.example` in `packages/mobile/` with required environment variables

---

## Phase 2: Foundational - Shared Code Architecture (Priority: P1) 🎯 MVP

**Goal**: Extract shareable code from PWA into packages/shared to enable 70%+ code sharing

**Independent Test**: Import shared hooks/stores in both web and mobile apps, verify identical behavior

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared API Layer

- [ ] T010 [P] Create `packages/shared/api/client.ts` with platform-agnostic fetch wrapper (extract from web-app/src/api/client.ts)
- [ ] T011 [P] Move `schema.ts` generation target to `packages/shared/api/schema.ts` in OpenAPI config
- [ ] T012 [P] Create `packages/shared/api/validation.ts` with Zod schemas (extract from web-app/src/api/validation.ts)
- [ ] T013 [P] Create `packages/shared/api/queryKeys.ts` with TanStack Query keys (extract from web-app/src/api/queryKeys.ts)
- [ ] T014 Create `packages/shared/api/index.ts` barrel export for API module

### Shared State Management

- [ ] T015 [P] Create `packages/shared/stores/auth.ts` without persist middleware (extract from web-app/src/shared/stores/auth.ts)
- [ ] T016 [P] Create `packages/shared/stores/settings.ts` without persist middleware (extract platform-agnostic parts)
- [ ] T017 [P] Create `packages/shared/stores/demo.ts` for demo mode state (extract from web-app/src/shared/stores/demo/)
- [ ] T018 Create `packages/shared/stores/index.ts` barrel export for stores module

### Shared Hooks

- [ ] T019 [P] Create `packages/shared/hooks/useAssignments.ts` with TanStack Query hook (extract from web-app)
- [ ] T020 [P] Create `packages/shared/hooks/useCompensations.ts` with TanStack Query hook (extract from web-app)
- [ ] T021 [P] Create `packages/shared/hooks/useExchanges.ts` with TanStack Query hook (extract from web-app)
- [ ] T022 [P] Create `packages/shared/hooks/useAuth.ts` with auth state hook (extract from web-app)
- [ ] T023 Create `packages/shared/hooks/index.ts` barrel export for hooks module

### Shared Utilities

- [ ] T024 [P] Create `packages/shared/utils/date-helpers.ts` (extract from web-app/src/shared/utils/date-helpers.ts)
- [ ] T025 [P] Create `packages/shared/utils/assignment-helpers.ts` (extract from web-app)
- [ ] T026 [P] Create `packages/shared/utils/error-helpers.ts` (extract from web-app)
- [ ] T027 Create `packages/shared/utils/index.ts` barrel export for utils module

### Shared i18n

- [ ] T028 [P] Create `packages/shared/i18n/types.ts` (extract from web-app/src/i18n/types.ts)
- [ ] T029 [P] Copy locale files to `packages/shared/i18n/locales/` (de.json, en.json, fr.json, it.json)
- [ ] T030 [P] Create `packages/shared/i18n/index.ts` with translation functions (platform-agnostic)
- [ ] T031 Create `packages/shared/i18n/useTranslation.ts` React hook wrapper

### Shared Types

- [ ] T032 [P] Create `packages/shared/types/index.ts` with common TypeScript types (extract from web-app)
- [ ] T033 [P] Create `packages/shared/types/platform.ts` with platform adapter interfaces (StorageAdapter, SecureStorageAdapter, BiometricAdapter)

### Platform Adapter Interfaces

- [ ] T034 Create `packages/shared/adapters/storage.ts` with StorageAdapter interface definition
- [ ] T035 Create `packages/shared/adapters/index.ts` barrel export for adapters

### Package Configuration

- [ ] T036 Create `packages/shared/package.json` with name `@volleykit/shared` and exports
- [ ] T037 Create `packages/shared/index.ts` main barrel export for entire shared package
- [ ] T038 Update `packages/web/` to import from `@volleykit/shared` instead of local paths (refactor existing web-app)
- [ ] T039 Verify web-app builds successfully with shared package imports

**Checkpoint**: Shared package complete - mobile app can now import from @volleykit/shared

---

## Phase 3: User Story 1 - Core App Installation and Authentication (Priority: P1) 🎯 MVP

**Goal**: Native iOS and Android apps installable from app stores with SwissVolley login

**Independent Test**: Download app from TestFlight/Internal Testing, launch, log in with SwissVolley credentials, view dashboard with assignments

### Mobile Platform Adapters

- [ ] T040 [P] [US1] Create `packages/mobile/src/platform/storage.ts` implementing StorageAdapter with AsyncStorage
- [ ] T041 [P] [US1] Create `packages/mobile/src/platform/index.ts` barrel export for platform module

### Mobile Navigation

- [ ] T042 [US1] Install React Navigation dependencies in `packages/mobile/package.json` (@react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs)
- [ ] T043 [US1] Create `packages/mobile/src/navigation/types.ts` with navigation param types
- [ ] T044 [US1] Create `packages/mobile/src/navigation/TabNavigator.tsx` with bottom tabs (Assignments, Compensations, Exchanges, Settings)
- [ ] T045 [US1] Create `packages/mobile/src/navigation/RootNavigator.tsx` with auth flow (Login vs Main)
- [ ] T046 [US1] Create `packages/mobile/src/navigation/index.ts` barrel export

### Mobile Screens - Authentication

- [ ] T047 [US1] Create `packages/mobile/src/screens/LoginScreen.tsx` with credential form matching PWA login
- [ ] T048 [US1] Create `packages/mobile/src/screens/LoadingScreen.tsx` for app initialization state

### Mobile Screens - Main Features

- [ ] T049 [P] [US1] Create `packages/mobile/src/screens/AssignmentsScreen.tsx` displaying assignment list using shared hook
- [ ] T050 [P] [US1] Create `packages/mobile/src/screens/AssignmentDetailScreen.tsx` with assignment details
- [ ] T051 [P] [US1] Create `packages/mobile/src/screens/CompensationsScreen.tsx` displaying compensation list
- [ ] T052 [P] [US1] Create `packages/mobile/src/screens/ExchangesScreen.tsx` displaying exchange list
- [ ] T053 [P] [US1] Create `packages/mobile/src/screens/SettingsScreen.tsx` with basic settings (language, profile)

### Mobile App Entry

- [ ] T054 [US1] Create `packages/mobile/src/providers/AppProviders.tsx` with QueryClient, platform context providers
- [ ] T055 [US1] Update `packages/mobile/App.tsx` with providers and root navigator
- [ ] T056 [US1] Configure deep linking in `packages/mobile/app.json` with URL scheme `volleykit://`

### Build Configuration

- [ ] T057 [US1] Configure iOS build settings in `packages/mobile/app.json` (bundleIdentifier, version, icon)
- [ ] T058 [US1] Configure Android build settings in `packages/mobile/app.json` (package, versionCode, icon)
- [ ] T059 [US1] Run `npx expo prebuild` to generate native projects
- [ ] T060 [US1] Create EAS Build configuration in `packages/mobile/eas.json` for development and production profiles

**Checkpoint**: User Story 1 complete - App can be installed and user can log in and view all core data

---

## Phase 4: User Story 2 - Biometric Quick Login (Priority: P2)

**Goal**: Face ID/Touch ID/fingerprint authentication for seamless re-login with stored credentials

**Independent Test**: Enable biometric login in settings, close app, reopen after session expires, use biometrics to auto-login in <3s

### SecureCredential Entity Implementation

- [ ] T061 [P] [US2] Install expo-secure-store and expo-local-authentication in `packages/mobile/package.json`
- [ ] T062 [US2] Create `packages/mobile/src/platform/secureStorage.ts` implementing SecureStorageAdapter with expo-secure-store
- [ ] T063 [US2] Create `packages/mobile/src/platform/biometrics.ts` implementing BiometricAdapter with expo-local-authentication

### Biometric Settings UI

- [ ] T064 [US2] Create `packages/mobile/src/screens/BiometricSettingsScreen.tsx` with enable/disable toggle
- [ ] T065 [US2] Update `packages/mobile/src/screens/SettingsScreen.tsx` to link to BiometricSettings

### Biometric Authentication Flow

- [ ] T066 [US2] Create `packages/mobile/src/hooks/useBiometricAuth.ts` with biometric check and credential retrieval logic
- [ ] T067 [US2] Update `packages/mobile/src/navigation/RootNavigator.tsx` to check for biometric re-auth on session expiry
- [ ] T068 [US2] Create `packages/mobile/src/components/BiometricPrompt.tsx` for biometric authentication UI
- [ ] T069 [US2] Add fallback to password entry after 3 failed biometric attempts in LoginScreen

### Session Expiry Handling

- [ ] T070 [US2] Create `packages/mobile/src/hooks/useSessionMonitor.ts` to detect session expiration and trigger biometric re-auth
- [ ] T071 [US2] Update `packages/mobile/src/providers/AppProviders.tsx` to include session monitoring

**Checkpoint**: User Story 2 complete - Biometric login works independently, <3s re-authentication

---

## Phase 5: User Story 3 - Native Calendar Integration (Priority: P2)

**Goal**: Subscribe to iCal feed or add assignments directly to device calendar with deep linking back

**Independent Test**: Enable calendar integration in settings, verify assignments appear in device calendar, tap event to open assignment in app

### CalendarEventMapping Entity Implementation

- [ ] T072 [P] [US3] Install expo-calendar in `packages/mobile/package.json`
- [ ] T073 [US3] Create `packages/mobile/src/platform/calendar.ts` with calendar access functions (getCalendars, createEvent, updateEvent)
- [ ] T074 [US3] Create `packages/mobile/src/types/calendar.ts` with CalendarEventMapping type definition

### Calendar Settings UI

- [ ] T075 [US3] Create `packages/mobile/src/screens/CalendarSettingsScreen.tsx` with iCal vs direct event choice
- [ ] T076 [US3] Update `packages/mobile/src/screens/SettingsScreen.tsx` to link to CalendarSettings
- [ ] T077 [US3] Create `packages/mobile/src/components/CalendarPicker.tsx` for selecting target calendar

### iCal Subscription Flow

- [ ] T078 [US3] Create `packages/mobile/src/utils/calendar.ts` with iCal URL generation and Linking.openURL for webcal://
- [ ] T079 [US3] Add iCal subscription button in CalendarSettingsScreen with URL scheme launch

### Direct Calendar Events Flow

- [ ] T080 [US3] Create `packages/mobile/src/hooks/useCalendarSync.ts` with assignment-to-event mapping and sync logic
- [ ] T081 [US3] Create `packages/mobile/src/services/calendarSync.ts` with createEventsFromAssignments, updateEvents, deleteOrphanedEvents
- [ ] T082 [US3] Store CalendarEventMapping in AsyncStorage via `packages/mobile/src/stores/calendarMappings.ts`

### Deep Linking from Calendar

- [ ] T083 [US3] Update deep link handling in RootNavigator to parse `volleykit://assignment/{id}` URLs
- [ ] T084 [US3] Add deep link URL to calendar event notes in calendarSync.ts for back-navigation

**Checkpoint**: User Story 3 complete - Calendar integration works independently, both iCal and direct events

---

## Phase 6: User Story 4 - Home Screen Widget (Priority: P3)

**Goal**: iOS and Android home screen widgets showing next 3 upcoming assignments from cached data

**Independent Test**: Add widget to home screen, verify it shows cached assignments, tap to open assignment in app

### WidgetData Entity Implementation

- [ ] T085 [P] [US4] Install react-native-widgetkit in `packages/mobile/package.json`
- [ ] T086 [US4] Create `packages/mobile/src/types/widget.ts` with WidgetData and WidgetAssignment types
- [ ] T087 [US4] Create `packages/mobile/src/platform/widgets.ts` with shared widget data functions

### iOS Widget Extension

- [ ] T088 [US4] Create iOS widget extension in `packages/mobile/ios/VolleyKitWidget/` with Swift UI widget
- [ ] T089 [US4] Configure App Group for data sharing between main app and widget in Xcode
- [ ] T090 [US4] Create `packages/mobile/ios/VolleyKitWidget/VolleyKitWidget.swift` with widget view (next 3 assignments, last updated)
- [ ] T091 [US4] Configure widget sizes (small, medium) in widget extension

### Android Widget

- [ ] T092 [US4] Install react-native-android-widget in `packages/mobile/package.json`
- [ ] T093 [US4] Create Android widget in `packages/mobile/android/app/src/main/java/.../widget/` with Kotlin implementation
- [ ] T094 [US4] Create widget layout XML in `packages/mobile/android/app/src/main/res/layout/`
- [ ] T095 [US4] Configure widget provider in AndroidManifest.xml

### Widget Data Bridge

- [ ] T096 [US4] Create `packages/mobile/src/services/widgetDataBridge.ts` to write widget data on assignment refresh
- [ ] T097 [US4] Update useAssignments hook to trigger widget data update after successful fetch
- [ ] T098 [US4] Add "last updated" timestamp to widget data for staleness indicator

### Widget Deep Linking

- [ ] T099 [US4] Configure widget tap action to open `volleykit://assignment/{id}` deep link
- [ ] T100 [US4] Handle empty state in widget ("Please open VolleyKit to sync")

**Checkpoint**: User Story 4 complete - Widgets work independently on both iOS and Android

---

## Phase 7: User Story 5 - Offline Data Viewing (Priority: P3)

**Goal**: Read-only access to cached assignment data when offline with clear freshness indicators

**Independent Test**: View assignments online, enable airplane mode, reopen app, verify cached data displays with "Last updated" indicator

### CachedData Entity Implementation

- [ ] T101 [P] [US5] Create `packages/mobile/src/types/cache.ts` with CachedData type definition
- [ ] T102 [US5] Create `packages/mobile/src/services/cacheService.ts` with save/load/clear cache functions using AsyncStorage

### Offline Detection

- [ ] T103 [US5] Install @react-native-community/netinfo in `packages/mobile/package.json`
- [ ] T104 [US5] Create `packages/mobile/src/hooks/useNetworkStatus.ts` with online/offline state detection
- [ ] T105 [US5] Create `packages/mobile/src/providers/NetworkProvider.tsx` with network context

### Cache Integration with TanStack Query

- [ ] T106 [US5] Create `packages/mobile/src/services/queryPersistence.ts` with TanStack Query persistence adapter
- [ ] T107 [US5] Update `packages/mobile/src/providers/AppProviders.tsx` to configure QueryClient with cache persistence
- [ ] T108 [US5] Configure staleTime and cacheTime in query hooks for 30-day cache validity

### Offline UI Feedback

- [ ] T109 [US5] Create `packages/mobile/src/components/OfflineBanner.tsx` showing offline status
- [ ] T110 [US5] Create `packages/mobile/src/components/LastUpdatedIndicator.tsx` showing cache freshness
- [ ] T111 [US5] Update screen components to show LastUpdatedIndicator when data is from cache

### Offline Action Prevention

- [ ] T112 [US5] Create `packages/mobile/src/components/OfflineActionBlocker.tsx` modal for offline action attempts
- [ ] T113 [US5] Update action buttons (accept/decline assignment) to check network status before execution

**Checkpoint**: User Story 5 complete - Offline viewing works independently with clear freshness indicators

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

### Performance Optimization

- [ ] T114 [P] Optimize bundle size with lazy loading for heavy screens in navigation configuration
- [ ] T115 [P] Profile and optimize cold start time to meet <3s target
- [ ] T116 [P] Add splash screen configuration in `packages/mobile/app.json`

### Error Handling

- [ ] T117 Create `packages/mobile/src/components/ErrorBoundary.tsx` for graceful error handling
- [ ] T118 Create `packages/mobile/src/components/ErrorScreen.tsx` for fatal error display with retry
- [ ] T119 Add error boundaries around each tab navigator screen

### Accessibility

- [ ] T120 [P] Audit all screens for accessibility (aria-labels, roles, focus management)
- [ ] T121 [P] Add accessibility labels to all icon-only buttons across screens
- [ ] T122 [P] Test with VoiceOver (iOS) and TalkBack (Android)

### Documentation

- [ ] T123 [P] Update `packages/mobile/README.md` with setup and development instructions
- [ ] T124 [P] Update root `CLAUDE.md` with mobile development commands
- [ ] T125 [P] Create app store metadata (description, screenshots, keywords) in `docs/app-store/`

### CI/CD Integration

- [ ] T126 Create `.github/workflows/ci-mobile.yml` for mobile build validation
- [ ] T127 Configure EAS Build integration with GitHub Actions for preview builds
- [ ] T128 Add mobile test commands to root `package.json` scripts

### Final Validation

- [ ] T129 Run quickstart.md validation steps on fresh clone
- [ ] T130 Verify 70%+ code sharing metric between web and mobile
- [ ] T131 Performance test all user stories against success criteria (SC-001 to SC-008)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (US6 - Shared Code Architecture) ← BLOCKS ALL STORIES
    ↓
┌───────────────┬───────────────┬───────────────┬───────────────┐
│   Phase 3     │   Phase 4     │   Phase 5     │   Phase 6/7   │
│  US1 (P1) MVP │  US2 (P2)     │  US3 (P2)     │  US4/5 (P3)   │
│  Core App     │  Biometrics   │  Calendar     │  Widget/Offline│
└───────────────┴───────────────┴───────────────┴───────────────┘
                            ↓
                    Phase 8: Polish
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Core App) | Foundational (US6) | Phase 2 complete |
| US2 (Biometrics) | US1 (needs login flow) | Phase 3 complete |
| US3 (Calendar) | Foundational (US6) | Phase 2 complete |
| US4 (Widget) | US1 (needs assignments) | Phase 3 complete |
| US5 (Offline) | US1 (needs data to cache) | Phase 3 complete |

### Parallel Opportunities

**Phase 1 (Setup)**: T003-T006, T008-T009 can run in parallel
**Phase 2 (Foundational)**: T010-T013, T015-T017, T019-T022, T024-T026, T028-T030, T032-T033 can run in parallel
**Phase 3 (US1)**: T040-T041, T049-T053 can run in parallel
**Phase 4-7**: Each story can potentially run in parallel with different team members after Phase 3

---

## Parallel Execution Examples

### Phase 2: Shared Package Extraction

```bash
# Launch all API layer tasks together:
Task: "Create packages/shared/api/client.ts with platform-agnostic fetch wrapper"
Task: "Move schema.ts generation target to packages/shared/api/schema.ts"
Task: "Create packages/shared/api/validation.ts with Zod schemas"
Task: "Create packages/shared/api/queryKeys.ts with TanStack Query keys"

# Launch all hook extraction tasks together:
Task: "Create packages/shared/hooks/useAssignments.ts"
Task: "Create packages/shared/hooks/useCompensations.ts"
Task: "Create packages/shared/hooks/useExchanges.ts"
Task: "Create packages/shared/hooks/useAuth.ts"
```

### Phase 3: Screen Implementation

```bash
# Launch all main screens together:
Task: "Create packages/mobile/src/screens/AssignmentsScreen.tsx"
Task: "Create packages/mobile/src/screens/CompensationsScreen.tsx"
Task: "Create packages/mobile/src/screens/ExchangesScreen.tsx"
Task: "Create packages/mobile/src/screens/SettingsScreen.tsx"
```

---

## Implementation Strategy

### MVP First (Phases 1-3)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational/US6 (T010-T039) - **CRITICAL GATE**
3. Complete Phase 3: US1 Core App (T040-T060)
4. **STOP and VALIDATE**: App installable, login works, core data visible
5. Submit to TestFlight/Internal Testing for early feedback

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | Setup + US6 + US1 | Installable app with login |
| v1.1 | + US2 | Biometric convenience |
| v1.2 | + US3 | Calendar integration |
| v1.3 | + US4 + US5 | Widgets + offline |
| v1.4 | Polish | Production-ready |

### Parallel Team Strategy

With 2+ developers after Phase 2:

- **Developer A**: US1 → US2 (auth expertise)
- **Developer B**: US3 → US4/US5 (native features expertise)

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 | Setup | 9 | 6 |
| 2 | US6 Foundational | 30 | 22 |
| 3 | US1 Core App | 21 | 7 |
| 4 | US2 Biometrics | 11 | 1 |
| 5 | US3 Calendar | 13 | 1 |
| 6 | US4 Widget | 16 | 1 |
| 7 | US5 Offline | 13 | 1 |
| 8 | Polish | 18 | 10 |
| **Total** | | **131** | **49** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP scope: Phases 1-3 (Setup + Foundational + US1) = 60 tasks
