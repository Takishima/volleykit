# Feature Specification: React Native Mobile App

**Feature Branch**: `001-react-native-app`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Plan the addition of a React Native app that can be installed natively on both iOS and Android. Keep both the PWA and the native app going forward. Advanced features will only be available in the native app due to inherent limitations for PWAs."

## Overview

Add a native mobile application for VolleyKit using React Native, targeting both iOS and Android platforms. The native app will coexist with the existing Progressive Web App (PWA), sharing as much business logic as possible while providing enhanced native capabilities that PWAs cannot offer.

**Key Constraint**: SwissVolley session tokens expire after 15-30 minutes, and no server infrastructure exists for push notifications. Native features must work within these constraints.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core App Installation and Authentication (Priority: P1)

A volleyball referee wants to install the VolleyKit app from their device's app store and log in using their existing SwissVolley credentials. They expect the same familiar interface as the PWA but with the benefits of a native app installation.

**Why this priority**: Without successful installation and authentication, no other features can be accessed. This is the foundation of the entire native app experience.

**Independent Test**: Can be fully tested by downloading from app store, launching app, and successfully logging in with SwissVolley credentials. Delivers immediate value by providing a native app entry point.

**Acceptance Scenarios**:

1. **Given** a user searches for "VolleyKit" in the App Store/Play Store, **When** they find and install the app, **Then** the app installs successfully and appears on their home screen with the VolleyKit icon
2. **Given** an installed app with the user not logged in, **When** the user enters valid SwissVolley credentials, **Then** they are authenticated and see their dashboard with assignments
3. **Given** a user logged into the PWA, **When** they install and open the native app, **Then** they must log in separately (sessions are not shared between PWA and native)
4. **Given** the app is installed, **When** the user opens it while offline, **Then** they see their cached data from the last successful sync (if previously logged in)

---

### User Story 2 - Biometric Quick Login (Priority: P2)

A referee who frequently accesses the app wants to use Face ID, Touch ID, or fingerprint authentication to quickly log in. Since session tokens are short-lived (15-30 minutes), biometrics securely store encrypted credentials and perform a fresh login automatically.

**Why this priority**: Biometric login significantly improves daily usability for frequent users. Given the short session token lifetime, this provides a seamless way to re-authenticate without manual credential entry.

**Independent Test**: Can be fully tested by enabling biometric login in settings, closing the app, reopening after session expires, and using biometrics to seamlessly re-authenticate. Delivers convenience value for returning users.

**Acceptance Scenarios**:

1. **Given** a logged-in user with biometrics available on their device, **When** they enable biometric login in settings, **Then** their credentials are securely stored in the device's secure enclave/keystore
2. **Given** biometric login enabled, **When** the user opens the app with an expired session, **Then** they are prompted for biometric authentication
3. **Given** biometric authentication succeeds, **When** credentials are retrieved, **Then** a fresh login is performed automatically and the user sees their dashboard
4. **Given** biometric authentication fails 3 times, **When** the user tries again, **Then** they are prompted to enter their password manually
5. **Given** biometrics enabled and the user changes their device passcode/biometrics, **When** they open the app, **Then** stored credentials are invalidated and they must log in manually

---

### User Story 3 - Native Calendar Integration (Priority: P2)

A referee wants their calendar app to include their VolleyKit assignments. The native app provides a streamlined way to subscribe to the existing iCal feed or manually add events to the device calendar. This is a one-way flow: assignments from VolleyManager are added to the user's calendar (read-only source).

**Why this priority**: Referees rely heavily on calendar integration for planning their schedules. Native apps provide better calendar integration than PWAs, including direct event creation to the device calendar.

**Independent Test**: Can be fully tested by enabling calendar integration, viewing device calendar, and verifying assignments appear as events. Delivers schedule visibility value.

**Acceptance Scenarios**:

1. **Given** the user is logged in, **When** they enable calendar integration in settings, **Then** they can choose to subscribe to their iCal feed or add events directly
2. **Given** iCal subscription is chosen, **When** the user confirms, **Then** the device calendar app opens with the subscription URL pre-filled
3. **Given** direct calendar events is chosen, **When** the user syncs, **Then** current assignments are added as events to a selected calendar
4. **Given** an assignment exists as a calendar event, **When** the user taps it, **Then** they can deep-link back to the assignment in VolleyKit

---

### User Story 4 - Home Screen Widget (Priority: P3)

A referee wants to see their upcoming assignments at a glance directly on their home screen without opening the app. The widget shows cached assignment data from the last app session.

**Why this priority**: Widgets provide convenient quick access but are not essential for core functionality. Due to session token constraints, widgets display cached data rather than live data.

**Independent Test**: Can be fully tested by adding the VolleyKit widget to home screen and verifying it displays upcoming assignments from the last sync. Delivers at-a-glance convenience.

**Acceptance Scenarios**:

1. **Given** the app is installed and user has logged in at least once, **When** they add the VolleyKit widget to their home screen, **Then** it displays their upcoming assignments from cached data
2. **Given** a widget is on the home screen, **When** the user opens and uses the app, **Then** the widget data refreshes with the latest information
3. **Given** a widget showing assignments, **When** the user taps on an assignment, **Then** the app opens directly to that assignment's detail view
4. **Given** the user has never logged in or cache is empty, **When** they view the widget, **Then** it displays a "Please open VolleyKit to sync" message
5. **Given** cached data is more than 24 hours old, **When** the widget displays, **Then** it shows a "Last updated" timestamp to indicate data freshness

---

### User Story 5 - Enhanced Offline Mode (Priority: P2)

A referee traveling to a venue with poor connectivity wants to access their assignment details offline and perform basic actions that sync when connectivity returns and they re-authenticate.

**Why this priority**: Referees often travel to venues with poor cellular coverage. Robust offline support is critical for real-world usability and is better implemented in native apps.

**Independent Test**: Can be fully tested by enabling airplane mode, opening the app, viewing assignment details, and verifying data is available. Delivers reliability in low-connectivity scenarios.

**Acceptance Scenarios**:

1. **Given** the user has previously viewed their assignments online, **When** they open the app offline, **Then** they can view all cached assignment details including venue addresses and contact info
2. **Given** the user is offline, **When** they attempt to accept or decline an assignment, **Then** the action is queued locally and a message indicates it will sync when online
3. **Given** the user performed offline actions, **When** connectivity is restored and they have a valid session, **Then** queued actions are synced and the user is notified of success/failure
4. **Given** an offline action cannot be synced (session expired), **When** the user re-authenticates, **Then** pending actions are synced automatically
5. **Given** an offline action conflicts with a server change (e.g., assignment was modified), **When** sync occurs, **Then** the user is notified of the conflict and can resolve it

---

### User Story 6 - Shared Code Architecture (Priority: P1)

The development team wants to maximize code sharing between the PWA and React Native app to reduce maintenance burden and ensure feature parity for common functionality.

**Why this priority**: Without a solid shared architecture, maintaining two separate apps becomes unsustainable. This is a technical foundation that enables all other features.

**Independent Test**: Can be fully tested by implementing a feature in shared code and verifying it works identically in both PWA and native app. Delivers long-term maintainability.

**Acceptance Scenarios**:

1. **Given** the codebase architecture, **When** a bug is fixed in shared business logic, **Then** the fix applies to both PWA and native app without duplication
2. **Given** API client code is shared, **When** the SwissVolley API changes, **Then** updates are made once and apply to both platforms
3. **Given** platform-specific features (biometrics, calendar integration), **When** implemented, **Then** they use platform abstractions that don't pollute shared code
4. **Given** translations are managed, **When** a new string is added, **Then** it is available in both PWA and native app

---

### Edge Cases

- What happens when the user's session expires during app use? (Show session expired message, offer biometric re-login if enabled)
- How does the app handle being installed alongside the PWA on the same device? (Both should work independently)
- How does offline mode handle data that has expired cache validity? (Show cached data with "last updated" indicator)
- What happens when queued offline actions pile up and session is expired? (Prompt for login, then sync all pending actions)
- How does the widget behave when the app is uninstalled but widget remains? (Show error state)
- What happens if biometric credentials become invalid (password changed externally)? (Clear stored credentials, require manual login)

## Requirements *(mandatory)*

### Functional Requirements

**App Foundation**
- **FR-001**: System MUST provide native iOS and Android applications installable from the Apple App Store and Google Play Store
- **FR-002**: System MUST authenticate users using existing SwissVolley credentials (same auth flow as PWA)
- **FR-003**: System MUST display the same core data as the PWA (assignments, compensations, exchanges, profile)
- **FR-004**: System MUST support all four languages (German, English, French, Italian) matching the PWA
- **FR-005**: System MUST handle session expiration gracefully with clear user messaging and re-authentication options

**Biometric Authentication**
- **FR-006**: System MUST support Face ID on compatible iOS devices
- **FR-007**: System MUST support Touch ID on compatible iOS devices
- **FR-008**: System MUST support fingerprint authentication on compatible Android devices
- **FR-009**: System MUST securely store encrypted credentials in the device's secure enclave/keystore
- **FR-010**: System MUST perform fresh authentication when biometrics unlock stored credentials
- **FR-011**: System MUST provide password fallback when biometric authentication fails or is unavailable
- **FR-012**: System MUST invalidate stored credentials when device security settings change

**Calendar Integration** (one-way: VolleyManager → device calendar, read-only source)
- **FR-013**: System MUST support subscribing to the user's iCal feed via the device's calendar app
- **FR-014**: System MUST support adding assignments as individual events to a user-selected device calendar
- **FR-015**: System MUST support deep linking from calendar events back to assignments in the app
- **FR-016**: Calendar events MUST be created from VolleyManager data only (no write-back to VolleyManager)

**Offline Capabilities**
- **FR-017**: System MUST cache assignment data for offline viewing
- **FR-018**: System MUST queue user actions (accept/decline) when offline
- **FR-019**: System MUST sync queued actions when connectivity and valid session are available
- **FR-020**: System MUST clearly indicate offline status and last sync time to users
- **FR-021**: System MUST handle sync conflicts gracefully with user notification

**Widget**
- **FR-022**: System MUST provide a home screen widget showing upcoming assignments (iOS and Android)
- **FR-023**: Widget MUST display cached data from the most recent app session
- **FR-024**: Widget MUST support deep linking to specific assignments in the app
- **FR-025**: Widget MUST indicate data freshness with "last updated" timestamp when data is stale

**Code Architecture**
- **FR-026**: System MUST share business logic, API clients, and state management with the PWA where possible
- **FR-027**: System MUST use platform-specific implementations only for native features (biometrics, calendar, widgets)
- **FR-028**: System MUST maintain a monorepo structure enabling code sharing between web and mobile

### Key Entities

- **User**: Authenticated volleyball referee with credentials and preferences
- **Assignment**: Game assignment with date, time, venue, teams, role, and status (same as PWA)
- **SecureCredential**: Encrypted user credentials stored in device secure storage for biometric login
- **OfflineAction**: Queued user action performed while offline, pending synchronization
- **CachedData**: Locally stored assignment and profile data with sync timestamps

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Native apps are successfully published and available on both App Store and Play Store
- **SC-002**: Users can install and log in within 2 minutes of first launch
- **SC-003**: Biometric re-authentication completes in under 3 seconds (including credential retrieval and fresh login)
- **SC-004**: Offline mode provides access to at least the last 30 days of assignment data
- **SC-005**: Calendar subscription can be set up in under 1 minute
- **SC-006**: At least 70% of business logic code is shared between PWA and native app
- **SC-007**: Home screen widget displays data within 1 second of being added
- **SC-008**: App startup time (cold start to interactive) is under 3 seconds on mid-range devices
- **SC-009**: Queued offline actions sync successfully within 10 seconds of session restoration

## Assumptions

- SwissVolley session tokens have a 15-30 minute lifetime and cannot be extended
- Users will need to grant appropriate permissions (calendar, biometrics) for native features
- The existing PWA codebase uses patterns (Zustand, TanStack Query, TypeScript) compatible with React Native
- App store approval processes will be followed for both iOS and Android
- The existing iCal subscription URL from the PWA can be reused for native calendar integration
- Background tasks cannot maintain active sessions due to token lifetime constraints

## Clarifications

### Session 2026-01-13

- Q: How does calendar sync work with VolleyManager? → A: VolleyManager calendar is read-only. Data flows one-way: assignments are added TO the user's device calendar (not synced back to VolleyManager).

## Scope Boundaries

**In Scope**:
- iOS and Android native applications via React Native
- Biometric quick login (using stored credentials)
- Native calendar integration (iCal subscription and direct event creation)
- Home screen widgets (cached data display)
- Enhanced offline mode with action queuing
- Shared codebase architecture with the existing PWA
- Same feature set as PWA for core functionality (assignments, compensations, exchanges, settings)

**Out of Scope**:
- Push notifications (no server infrastructure available)
- Background data sync (session tokens too short-lived)
- Real-time widget updates (requires valid session)
- Desktop native applications (macOS, Windows)
- Features not currently in the PWA (new functionality beyond native enhancements)
- Apple Watch or Wear OS companion apps
- Tablet-optimized layouts (phone layouts will scale to tablets initially)
- In-app purchases or monetization features

## Dependencies

- Existing PWA codebase and its architecture decisions
- SwissVolley API and existing iCal feed functionality
- Apple Developer Program membership for iOS distribution
- Google Play Developer account for Android distribution
