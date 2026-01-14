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

- [x] T001 Create monorepo workspace structure with `packages/shared/`, `packages/web/`, `packages/mobile/` directories
- [x] T002 Initialize npm workspaces in root `package.json` with workspace configuration
- [x] T003 [P] Create Expo project in `packages/mobile/` using `npx create-expo-app --template expo-template-blank-typescript`
- [x] T004 [P] Configure TypeScript 5.9 in `packages/shared/tsconfig.json` with strict mode
- [x] T005 [P] Configure TypeScript 5.9 in `packages/mobile/tsconfig.json` extending shared config
- [x] T006 [P] Add ESLint configuration in `packages/mobile/.eslintrc.js` matching web-app patterns
- [x] T007 Configure Expo prebuild for native modules in `packages/mobile/app.json`
- [x] T008 [P] Add NativeWind (Tailwind CSS for RN) to `packages/mobile/package.json` and configure
- [x] T009 [P] Create `.env.example` in `packages/mobile/` with required environment variables

---

## Phase 2: Foundational - Shared Code Architecture (Priority: P1) 🎯 MVP

**Goal**: Extract shareable code from PWA into packages/shared to enable 70%+ code sharing

**Independent Test**: Import shared hooks/stores in both web and mobile apps, verify identical behavior

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared API Layer

- [ ] T010 [P] Create `packages/shared/api/client.ts` with platform-agnostic fetch wrapper (extract from web-app/src/api/client.ts)
- [ ] T011 [P] Move `schema.ts` generation target to `packages/shared/api/schema.ts` in OpenAPI config
- [x] T012 [P] Create `packages/shared/api/validation.ts` with Zod schemas (extract from web-app/src/api/validation.ts)
- [x] T013 [P] Create `packages/shared/api/queryKeys.ts` with TanStack Query keys (extract from web-app/src/api/queryKeys.ts)
- [x] T014 Create `packages/shared/api/index.ts` barrel export for API module

### Shared State Management

- [ ] T015 [P] Create `packages/shared/stores/auth.ts` without persist middleware (extract from web-app/src/shared/stores/auth.ts)
- [ ] T016 [P] Create `packages/shared/stores/settings.ts` without persist middleware (extract platform-agnostic parts)
- [x] T017 [P] Create `packages/shared/stores/demo.ts` for demo mode state (extract from web-app/src/shared/stores/demo/)
- [x] T018 Create `packages/shared/stores/index.ts` barrel export for stores module

### Shared Hooks

- [ ] T019 [P] Create `packages/shared/hooks/useAssignments.ts` with TanStack Query hook (extract from web-app)
- [ ] T020 [P] Create `packages/shared/hooks/useCompensations.ts` with TanStack Query hook (extract from web-app)
- [ ] T021 [P] Create `packages/shared/hooks/useExchanges.ts` with TanStack Query hook (extract from web-app)
- [x] T022 [P] Create `packages/shared/hooks/useAuth.ts` with auth state hook (extract from web-app)
- [x] T023 Create `packages/shared/hooks/index.ts` barrel export for hooks module

### Shared Utilities

- [x] T024 [P] Create `packages/shared/utils/date-helpers.ts` (extract from web-app/src/shared/utils/date-helpers.ts)
- [ ] T025 [P] Create `packages/shared/utils/assignment-helpers.ts` (extract from web-app)
- [ ] T026 [P] Create `packages/shared/utils/error-helpers.ts` (extract from web-app)
- [x] T027 Create `packages/shared/utils/index.ts` barrel export for utils module

### Shared i18n

- [x] T028 [P] Create `packages/shared/i18n/types.ts` (extract from web-app/src/i18n/types.ts)
- [ ] T029 [P] Copy locale files to `packages/shared/i18n/locales/` (de.json, en.json, fr.json, it.json)
- [x] T030 [P] Create `packages/shared/i18n/index.ts` with translation functions (platform-agnostic)
- [x] T031 Create `packages/shared/i18n/useTranslation.ts` React hook wrapper

### Shared Types

- [x] T032 [P] Create `packages/shared/types/index.ts` with common TypeScript types (extract from web-app)
- [x] T033 [P] Create `packages/shared/types/platform.ts` with platform adapter interfaces (StorageAdapter, SecureStorageAdapter, BiometricAdapter)

### Platform Adapter Interfaces

- [x] T034 Create `packages/shared/adapters/storage.ts` with StorageAdapter interface definition
- [x] T035 Create `packages/shared/adapters/index.ts` barrel export for adapters

### Package Configuration

- [x] T036 Create `packages/shared/package.json` with name `@volleykit/shared` and exports
- [x] T037 Create `packages/shared/index.ts` main barrel export for entire shared package
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

## Phase 6: User Story 5 - Smart Departure Reminder (Priority: P2)

**Goal**: Location-based notifications that alert users 15 min before they need to leave for assignments, with public transport routing via OJP SDK

**Independent Test**: Enable smart reminders in settings, be at a location different from venue, receive notification with correct transit details (stop, line, direction) 15 min before needing to leave

### Platform Adapters for Location & Notifications

- [ ] T085 [P] [US5] Install expo-location, expo-notifications, expo-task-manager in `packages/mobile/package.json`
- [ ] T086 [US5] Create `packages/mobile/src/platform/location.ts` implementing LocationAdapter with expo-location (requestPermissions, getCurrentLocation, startBackgroundTracking, stopBackgroundTracking)
- [ ] T087 [US5] Create `packages/mobile/src/platform/notifications.ts` implementing NotificationAdapter with expo-notifications (requestPermissions, scheduleNotification, cancelNotification)
- [ ] T088 [US5] Update `packages/mobile/src/platform/index.ts` to export location and notification adapters

### DepartureReminder Entity & Settings

- [ ] T089 [P] [US5] Create `packages/mobile/src/types/departureReminder.ts` with DepartureReminder, StopInfo, TripLeg, VenueCluster types
- [ ] T090 [US5] Create `packages/mobile/src/stores/departureReminderSettings.ts` with Zustand store (enabled, bufferMinutes: 5|10|15|20|30)
- [ ] T091 [US5] Create `packages/mobile/src/stores/departureReminders.ts` with active reminders state (transient, cleared after assignment)

### OJP SDK Integration

- [ ] T092 [US5] Verify `packages/shared/services/transport/` OJP client is platform-agnostic (uses fetch)
- [ ] T093 [US5] Create `packages/mobile/src/services/departure-reminder/route-calculator.ts` wrapping shared OJP client for trip calculation
- [ ] T094 [US5] Add route caching in route-calculator.ts to reduce OJP API calls (cache key: origin+destination+time)

### Venue Proximity Detection

- [ ] T095 [US5] Create `packages/shared/utils/geo.ts` with haversineDistance function (returns meters between two coordinates)
- [ ] T096 [US5] Create `packages/mobile/src/services/departure-reminder/venue-proximity.ts` with isNearVenue (500m threshold) and clusterNearbyVenues functions
- [ ] T097 [US5] Add unit tests for haversineDistance in `packages/shared/utils/geo.test.ts`

### Background Task Implementation

- [ ] T098 [US5] Create `packages/mobile/src/services/departure-reminder/background-task.ts` with hourly location check task using expo-task-manager
- [ ] T099 [US5] Implement task logic: check assignments within 6 hours, get location, check venue proximity, calculate route if needed
- [ ] T100 [US5] Configure task to only run when departureReminderEnabled is true and upcoming assignments exist
- [ ] T101 [US5] Add battery optimization: use Accuracy.Balanced, stop tracking after assignment time

### Notification Scheduling

- [ ] T102 [US5] Create `packages/mobile/src/services/departure-reminder/notification-scheduler.ts` with scheduleReminderNotification function
- [ ] T103 [US5] Create notification content template with i18n support: "[emoji] Leave for [Venue] in X min / Take [Line] from [Stop] (direction: [Terminus]) / Departure: [Time]"
- [ ] T104 [US5] Add notification translations to `packages/shared/i18n/locales/` for all 4 languages (de, en, fr, it)
- [ ] T105 [US5] Configure notification deep link to open assignment detail: `volleykit://assignment/{id}`

### Multi-Assignment Handling

- [ ] T106 [US5] Implement venue clustering in background-task.ts: group assignments with venues ≤500m apart
- [ ] T107 [US5] Create grouped notification content for venue clusters (list all assignment times/venues)
- [ ] T108 [US5] Suppress notifications when user already within 500m of venue (per FR-024)

### Fallback Behavior

- [ ] T109 [US5] Implement location unavailable fallback: simple time-based reminder without transit details
- [ ] T110 [US5] Implement no-route-found fallback: suggest leaving with buffer time for alternative transport
- [ ] T111 [US5] Add error handling for OJP API failures with graceful degradation

### Settings UI

- [ ] T112 [US5] Create `packages/mobile/src/screens/DepartureReminderSettingsScreen.tsx` with enable toggle and buffer time picker (5/10/15/20/30 min)
- [ ] T113 [US5] Update `packages/mobile/src/screens/SettingsScreen.tsx` to link to DepartureReminderSettings
- [ ] T114 [US5] Add location permission request flow in DepartureReminderSettingsScreen when enabling

### Data Lifecycle & Privacy

- [ ] T115 [US5] Create `packages/mobile/src/services/departure-reminder/cleanup.ts` to delete DepartureReminder data after assignment completion
- [ ] T116 [US5] Register cleanup on app foreground and after assignment time passes
- [ ] T117 [US5] Verify no location history is retained (per FR-026a)

### App Configuration

- [ ] T118 [US5] Add iOS location permissions to `packages/mobile/app.json` (NSLocationWhenInUseUsageDescription, NSLocationAlwaysUsageDescription)
- [ ] T119 [US5] Add Android location permissions to `packages/mobile/app.json` (ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION)
- [ ] T120 [US5] Add notification permissions configuration for iOS and Android 13+

**Checkpoint**: User Story 5 complete - Smart departure reminders work independently with location tracking, OJP routing, and local notifications

---

## Phase 7: User Story 4 - Home Screen Widget (Priority: P3)

**Goal**: iOS and Android home screen widgets showing next 3 upcoming assignments from cached data

**Independent Test**: Add widget to home screen, verify it shows cached assignments, tap to open assignment in app

### WidgetData Entity Implementation

- [ ] T121 [P] [US4] Install react-native-widgetkit in `packages/mobile/package.json`
- [ ] T122 [US4] Create `packages/mobile/src/types/widget.ts` with WidgetData and WidgetAssignment types
- [ ] T123 [US4] Create `packages/mobile/src/platform/widgets.ts` with shared widget data functions

### iOS Widget Extension

- [ ] T124 [US4] Create iOS widget extension in `packages/mobile/ios/VolleyKitWidget/` with Swift UI widget
- [ ] T125 [US4] Configure App Group for data sharing between main app and widget in Xcode
- [ ] T126 [US4] Create `packages/mobile/ios/VolleyKitWidget/VolleyKitWidget.swift` with widget view (next 3 assignments, last updated)
- [ ] T127 [US4] Configure widget sizes (small, medium) in widget extension

### Android Widget

- [ ] T128 [US4] Install react-native-android-widget in `packages/mobile/package.json`
- [ ] T129 [US4] Create Android widget in `packages/mobile/android/app/src/main/java/.../widget/` with Kotlin implementation
- [ ] T130 [US4] Create widget layout XML in `packages/mobile/android/app/src/main/res/layout/`
- [ ] T131 [US4] Configure widget provider in AndroidManifest.xml

### Widget Data Bridge

- [ ] T132 [US4] Create `packages/mobile/src/services/widgetDataBridge.ts` to write widget data on assignment refresh
- [ ] T133 [US4] Update useAssignments hook to trigger widget data update after successful fetch
- [ ] T134 [US4] Add "last updated" timestamp to widget data for staleness indicator

### Widget Deep Linking

- [ ] T135 [US4] Configure widget tap action to open `volleykit://assignment/{id}` deep link
- [ ] T136 [US4] Handle empty state in widget ("Please open VolleyKit to sync")

**Checkpoint**: User Story 4 complete - Widgets work independently on both iOS and Android

---

## Phase 8: User Story 6 - Offline Data Viewing (Priority: P3)

**Goal**: Read-only access to cached assignment data when offline with clear freshness indicators

**Independent Test**: View assignments online, enable airplane mode, reopen app, verify cached data displays with "Last updated" indicator

### CachedData Entity Implementation

- [ ] T137 [P] [US6] Create `packages/mobile/src/types/cache.ts` with CachedData type definition
- [ ] T138 [US6] Create `packages/mobile/src/services/cacheService.ts` with save/load/clear cache functions using AsyncStorage

### Offline Detection

- [ ] T139 [US6] Install @react-native-community/netinfo in `packages/mobile/package.json`
- [ ] T140 [US6] Create `packages/mobile/src/hooks/useNetworkStatus.ts` with online/offline state detection
- [ ] T141 [US6] Create `packages/mobile/src/providers/NetworkProvider.tsx` with network context

### Cache Integration with TanStack Query

- [ ] T142 [US6] Create `packages/mobile/src/services/queryPersistence.ts` with TanStack Query persistence adapter
- [ ] T143 [US6] Update `packages/mobile/src/providers/AppProviders.tsx` to configure QueryClient with cache persistence
- [ ] T144 [US6] Configure staleTime and cacheTime in query hooks for 30-day cache validity

### Offline UI Feedback

- [ ] T145 [US6] Create `packages/mobile/src/components/OfflineBanner.tsx` showing offline status
- [ ] T146 [US6] Create `packages/mobile/src/components/LastUpdatedIndicator.tsx` showing cache freshness
- [ ] T147 [US6] Update screen components to show LastUpdatedIndicator when data is from cache

### Offline Action Prevention

- [ ] T148 [US6] Create `packages/mobile/src/components/OfflineActionBlocker.tsx` modal for offline action attempts
- [ ] T149 [US6] Update action buttons (accept/decline assignment) to check network status before execution

**Checkpoint**: User Story 6 complete - Offline viewing works independently with clear freshness indicators

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

### Performance Optimization

- [ ] T150 [P] Optimize bundle size with lazy loading for heavy screens in navigation configuration
- [ ] T151 [P] Profile and optimize cold start time to meet <3s target
- [ ] T152 [P] Add splash screen configuration in `packages/mobile/app.json`

### Error Handling

- [ ] T153 Create `packages/mobile/src/components/ErrorBoundary.tsx` for graceful error handling
- [ ] T154 Create `packages/mobile/src/components/ErrorScreen.tsx` for fatal error display with retry
- [ ] T155 Add error boundaries around each tab navigator screen

### Accessibility

- [ ] T156 [P] Audit all screens for accessibility (aria-labels, roles, focus management)
- [ ] T157 [P] Add accessibility labels to all icon-only buttons across screens
- [ ] T158 [P] Test with VoiceOver (iOS) and TalkBack (Android)

### Documentation

- [ ] T159 [P] Update `packages/mobile/README.md` with setup and development instructions
- [ ] T160 [P] Update root `CLAUDE.md` with mobile development commands
- [ ] T161 [P] Create app store metadata (description, screenshots, keywords) in `docs/app-store/`

### CI/CD Integration

- [ ] T162 Create `.github/workflows/ci-mobile.yml` for mobile build validation
- [ ] T163 Configure EAS Build integration with GitHub Actions for preview builds
- [ ] T164 Add mobile test commands to root `package.json` scripts

### Final Validation

- [ ] T165 Run quickstart.md validation steps on fresh clone
- [ ] T166 Verify 70%+ code sharing metric between web and mobile
- [ ] T167 Performance test all user stories against success criteria (SC-001 to SC-008)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (US7 - Shared Code Architecture) ← BLOCKS ALL STORIES
    ↓
┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
│   Phase 3     │   Phase 4     │   Phase 5     │   Phase 6     │   Phase 7/8   │
│  US1 (P1) MVP │  US2 (P2)     │  US3 (P2)     │  US5 (P2)     │  US4/6 (P3)   │
│  Core App     │  Biometrics   │  Calendar     │  Departure    │  Widget/Offline│
└───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
                                    ↓
                            Phase 9: Polish
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Core App) | Foundational (US7) | Phase 2 complete |
| US2 (Biometrics) | US1 (needs login flow) | Phase 3 complete |
| US3 (Calendar) | Foundational (US7) | Phase 2 complete |
| US4 (Widget) | US1 (needs assignments) | Phase 3 complete |
| US5 (Smart Departure) | US1 (needs assignments) | Phase 3 complete |
| US6 (Offline) | US1 (needs data to cache) | Phase 3 complete |

### Parallel Opportunities

**Phase 1 (Setup)**: T003-T006, T008-T009 can run in parallel
**Phase 2 (Foundational)**: T010-T013, T015-T017, T019-T022, T024-T026, T028-T030, T032-T033 can run in parallel
**Phase 3 (US1)**: T040-T041, T049-T053 can run in parallel
**Phase 6 (US5)**: T085, T089 can run in parallel
**Phase 4-8**: Each story can potentially run in parallel with different team members after Phase 3

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

### Phase 6: Smart Departure Reminder

```bash
# Launch parallel platform adapter and type tasks:
Task: "Install expo-location, expo-notifications, expo-task-manager"
Task: "Create packages/mobile/src/types/departureReminder.ts"

# Launch all notification tasks together:
Task: "Create notification-scheduler.ts"
Task: "Add notification translations to locales/"
Task: "Configure notification deep link"
```

---

## Implementation Strategy

### MVP First (Phases 1-3)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational/US7 (T010-T039) - **CRITICAL GATE**
3. Complete Phase 3: US1 Core App (T040-T060)
4. **STOP and VALIDATE**: App installable, login works, core data visible
5. Submit to TestFlight/Internal Testing for early feedback

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | Setup + US7 + US1 | Installable app with login |
| v1.1 | + US2 | Biometric convenience |
| v1.2 | + US3 | Calendar integration |
| v1.3 | + US5 | Smart departure reminders |
| v1.4 | + US4 + US6 | Widgets + offline |
| v1.5 | Polish | Production-ready |

### Parallel Team Strategy

With 2+ developers after Phase 2:

- **Developer A**: US1 → US2 (auth expertise)
- **Developer B**: US3 → US5 (location/transport expertise)
- **Developer C**: US4 → US6 (native widgets/offline expertise)

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 | Setup | 9 | 6 |
| 2 | US7 Foundational | 30 | 22 |
| 3 | US1 Core App | 21 | 7 |
| 4 | US2 Biometrics | 11 | 1 |
| 5 | US3 Calendar | 13 | 1 |
| 6 | US5 Smart Departure | 36 | 2 |
| 7 | US4 Widget | 16 | 1 |
| 8 | US6 Offline | 13 | 1 |
| 9 | Polish | 18 | 10 |
| **Total** | | **167** | **51** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP scope: Phases 1-3 (Setup + Foundational + US1) = 60 tasks
