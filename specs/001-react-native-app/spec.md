# Feature Specification: React Native Mobile App

**Feature Branch**: `001-react-native-app`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Plan the addition of a React Native app that can be installed natively on both iOS and Android. Keep both the PWA and the native app going forward. Advanced features will only be available in the native app due to inherent limitations for PWAs."

## Overview

Add a native mobile application for VolleyKit using React Native, targeting both iOS and Android platforms. The native app will coexist with the existing Progressive Web App (PWA), sharing as much business logic as possible while providing enhanced native capabilities that PWAs cannot offer.

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

### User Story 2 - Push Notifications for Assignment Updates (Priority: P1)

A referee wants to receive timely push notifications when they receive new assignments, when assignments are modified, or when exchange requests are received. This ensures they never miss important updates even when the app is closed.

**Why this priority**: Push notifications are a primary differentiator from the PWA (especially on iOS where PWA push is limited). This feature alone justifies the native app for many users.

**Independent Test**: Can be fully tested by enabling notifications, triggering an assignment change, and verifying the notification appears on the device lock screen. Delivers value by keeping referees informed in real-time.

**Acceptance Scenarios**:

1. **Given** a user has granted notification permissions, **When** they receive a new assignment, **Then** a push notification appears with the assignment details (date, location, game type)
2. **Given** a user has granted notification permissions, **When** an existing assignment is modified (time, venue change), **Then** a push notification alerts them to the change
3. **Given** a user has granted notification permissions, **When** someone requests to exchange an assignment with them, **Then** they receive a notification with exchange request details
4. **Given** a user has denied notification permissions, **When** assignment changes occur, **Then** no notifications are sent and the user can enable them later in settings

---

### User Story 3 - Biometric Authentication (Priority: P2)

A referee who frequently accesses the app wants to use Face ID, Touch ID, or fingerprint authentication instead of entering credentials every time. This provides quick, secure access while maintaining security.

**Why this priority**: Biometric login significantly improves daily usability for frequent users. It's a strong native-only feature that enhances the user experience without blocking core functionality.

**Independent Test**: Can be fully tested by enabling biometric login in settings, closing the app, reopening, and using biometrics to authenticate. Delivers convenience value for returning users.

**Acceptance Scenarios**:

1. **Given** a logged-in user with biometrics available on their device, **When** they enable biometric login in settings, **Then** subsequent app opens prompt for biometric authentication
2. **Given** biometric login enabled, **When** the user opens the app and authenticates via Face ID/fingerprint, **Then** they are logged in without entering credentials
3. **Given** biometric authentication fails 3 times, **When** the user tries again, **Then** they are prompted to enter their password instead
4. **Given** biometrics enabled and the user changes their device passcode/biometrics, **When** they open the app, **Then** they must re-enter credentials for security

---

### User Story 4 - Background Calendar Synchronization (Priority: P2)

A referee wants their calendar app to stay synchronized with their VolleyKit assignments automatically, even when the app is not open. This ensures their personal calendar always reflects the latest assignment schedule.

**Why this priority**: Background sync is a significant native advantage over PWA. Referees rely heavily on calendar integration for planning their schedules around assignments.

**Independent Test**: Can be fully tested by enabling calendar sync, receiving a new assignment while app is closed, and verifying the assignment appears in the device calendar without opening VolleyKit.

**Acceptance Scenarios**:

1. **Given** calendar sync is enabled and the app has calendar permissions, **When** a new assignment is added to the user's account, **Then** the assignment is added to their device calendar within 15 minutes (background fetch)
2. **Given** calendar sync is enabled, **When** an assignment time or venue changes, **Then** the corresponding calendar event is updated automatically
3. **Given** calendar sync is enabled, **When** an assignment is cancelled, **Then** the calendar event is removed
4. **Given** the app is force-closed or device is restarted, **When** background sync interval occurs, **Then** sync resumes automatically without user intervention

---

### User Story 5 - Home Screen Widget (Priority: P3)

A referee wants to see their upcoming assignments at a glance directly on their home screen without opening the app. A widget shows the next 1-3 assignments with essential details.

**Why this priority**: Widgets provide convenient quick access but are not essential for core functionality. They enhance the native experience for power users.

**Independent Test**: Can be fully tested by adding the VolleyKit widget to home screen and verifying it displays upcoming assignments accurately. Delivers at-a-glance convenience.

**Acceptance Scenarios**:

1. **Given** the app is installed and user is logged in, **When** they add the VolleyKit widget to their home screen, **Then** it displays their next 1-3 upcoming assignments
2. **Given** a widget is on the home screen, **When** assignment data changes, **Then** the widget updates within 30 minutes
3. **Given** a widget showing assignments, **When** the user taps on an assignment, **Then** the app opens directly to that assignment's detail view
4. **Given** the user is logged out, **When** they view the widget, **Then** it displays a "Please log in" message

---

### User Story 6 - Offline Assignment Access and Actions (Priority: P2)

A referee traveling to a venue with poor connectivity wants to access their assignment details offline and perform basic actions that sync when connectivity returns.

**Why this priority**: Referees often travel to venues with poor cellular coverage. Robust offline support is critical for real-world usability and is better implemented in native apps.

**Independent Test**: Can be fully tested by enabling airplane mode, opening the app, viewing assignment details, and verifying data is available. Delivers reliability in low-connectivity scenarios.

**Acceptance Scenarios**:

1. **Given** the user has previously viewed their assignments online, **When** they open the app offline, **Then** they can view all cached assignment details including venue addresses and contact info
2. **Given** the user is offline, **When** they attempt to accept or decline an assignment, **Then** the action is queued and a notification indicates it will sync when online
3. **Given** the user performed offline actions, **When** connectivity is restored, **Then** queued actions are automatically synced and the user is notified of success/failure
4. **Given** an offline action conflicts with a server change (e.g., assignment was modified), **When** sync occurs, **Then** the user is notified of the conflict and can resolve it

---

### User Story 7 - Shared Code Architecture (Priority: P1)

The development team wants to maximize code sharing between the PWA and React Native app to reduce maintenance burden and ensure feature parity for common functionality.

**Why this priority**: Without a solid shared architecture, maintaining two separate apps becomes unsustainable. This is a technical foundation that enables all other features.

**Independent Test**: Can be fully tested by implementing a feature in shared code and verifying it works identically in both PWA and native app. Delivers long-term maintainability.

**Acceptance Scenarios**:

1. **Given** the codebase architecture, **When** a bug is fixed in shared business logic, **Then** the fix applies to both PWA and native app without duplication
2. **Given** API client code is shared, **When** the SwissVolley API changes, **Then** updates are made once and apply to both platforms
3. **Given** platform-specific features (push notifications, biometrics, background tasks), **When** implemented, **Then** they use platform abstractions that don't pollute shared code
4. **Given** translations are managed, **When** a new string is added, **Then** it is available in both PWA and native app

---

### Edge Cases

- What happens when the user's session expires while using biometric login? (Should prompt for full re-authentication)
- How does the app handle being installed alongside the PWA on the same device? (Both should work independently)
- What happens when push notification permissions are revoked at the OS level? (Graceful degradation, prompt to re-enable)
- How does offline mode handle data that has expired cache validity? (Show cached data with "last updated" indicator)
- What happens when background sync fails repeatedly? (Notify user, suggest manual sync)
- How does the widget behave when the app is uninstalled but widget remains? (Show error state)

## Requirements *(mandatory)*

### Functional Requirements

**App Foundation**
- **FR-001**: System MUST provide native iOS and Android applications installable from the Apple App Store and Google Play Store
- **FR-002**: System MUST authenticate users using existing SwissVolley credentials (same auth flow as PWA)
- **FR-003**: System MUST display the same core data as the PWA (assignments, compensations, exchanges, profile)
- **FR-004**: System MUST support all four languages (German, English, French, Italian) matching the PWA

**Push Notifications**
- **FR-005**: System MUST send push notifications for new assignment creation
- **FR-006**: System MUST send push notifications for assignment modifications (time, venue, cancellation)
- **FR-007**: System MUST send push notifications for incoming exchange requests
- **FR-008**: Users MUST be able to enable/disable notifications and configure notification types in settings

**Biometric Authentication**
- **FR-009**: System MUST support Face ID on compatible iOS devices
- **FR-010**: System MUST support Touch ID on compatible iOS devices
- **FR-011**: System MUST support fingerprint authentication on compatible Android devices
- **FR-012**: System MUST provide password fallback when biometric authentication fails or is unavailable

**Background Sync**
- **FR-013**: System MUST synchronize calendar events in the background when enabled
- **FR-014**: System MUST respect device battery optimization settings for background tasks
- **FR-015**: Users MUST be able to configure sync frequency in settings

**Offline Capabilities**
- **FR-016**: System MUST cache assignment data for offline viewing
- **FR-017**: System MUST queue user actions (accept/decline) when offline and sync when connectivity returns
- **FR-018**: System MUST clearly indicate offline status and last sync time to users
- **FR-019**: System MUST handle sync conflicts gracefully with user notification

**Widget**
- **FR-020**: System MUST provide a home screen widget showing upcoming assignments (iOS and Android)
- **FR-021**: Widget MUST update periodically via background refresh
- **FR-022**: Widget MUST support deep linking to specific assignments in the app

**Code Architecture**
- **FR-023**: System MUST share business logic, API clients, and state management with the PWA where possible
- **FR-024**: System MUST use platform-specific implementations only for native features (push, biometrics, background tasks)
- **FR-025**: System MUST maintain a monorepo structure enabling code sharing between web and mobile

### Key Entities

- **User**: Authenticated volleyball referee with credentials, preferences, and device tokens for push notifications
- **Assignment**: Game assignment with date, time, venue, teams, role, and status (same as PWA)
- **PushToken**: Device-specific token for sending push notifications, associated with a user account
- **OfflineAction**: Queued user action performed while offline, pending synchronization
- **SyncState**: Per-entity tracking of last sync time and cache validity

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Native apps are successfully published and available on both App Store and Play Store
- **SC-002**: Users can install and log in within 2 minutes of first launch
- **SC-003**: Push notifications are delivered within 60 seconds of the triggering event
- **SC-004**: 95% of push notifications are successfully delivered (as measured by notification service)
- **SC-005**: Biometric authentication completes in under 2 seconds
- **SC-006**: Offline mode provides access to at least the last 30 days of assignment data
- **SC-007**: Background calendar sync updates within 15 minutes of assignment changes
- **SC-008**: At least 70% of business logic code is shared between PWA and native app
- **SC-009**: Home screen widget updates within 30 minutes of data changes
- **SC-010**: App startup time (cold start to interactive) is under 3 seconds on mid-range devices

## Assumptions

- SwissVolley API supports or will support push notification registration endpoints
- Users will need to grant appropriate permissions (notifications, calendar, biometrics) for native features
- The existing PWA codebase uses patterns (Zustand, TanStack Query, TypeScript) compatible with React Native
- App store approval processes will be followed for both iOS and Android
- A push notification service (e.g., Firebase Cloud Messaging, Apple Push Notification service) will be used
- Background tasks are subject to OS restrictions and battery optimization; sync intervals may vary

## Scope Boundaries

**In Scope**:
- iOS and Android native applications via React Native
- Push notifications, biometric auth, background sync, widgets, offline mode
- Shared codebase architecture with the existing PWA
- Same feature set as PWA for core functionality (assignments, compensations, exchanges, settings)

**Out of Scope**:
- Desktop native applications (macOS, Windows)
- Features not currently in the PWA (new functionality beyond native enhancements)
- Apple Watch or Wear OS companion apps
- Tablet-optimized layouts (phone layouts will scale to tablets initially)
- In-app purchases or monetization features

## Dependencies

- Existing PWA codebase and its architecture decisions
- SwissVolley API availability and any required endpoints for push notification token registration
- Apple Developer Program membership for iOS distribution
- Google Play Developer account for Android distribution
- Push notification infrastructure (FCM for Android, APNs for iOS)
