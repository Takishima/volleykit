# Data Model: React Native Mobile App

**Date**: 2026-01-13
**Feature**: 001-react-native-app

## Overview

The mobile app reuses the same data entities as the PWA. This document describes the mobile-specific data structures and how existing entities are persisted on device.

## Shared Entities (from PWA)

These entities are defined in the OpenAPI schema (`docs/api/volleymanager-openapi.yaml`) and generated as TypeScript types (`packages/shared/api/schema.ts`).

### User

Authenticated volleyball referee with profile information.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| firstName | string | User's first name |
| lastName | string | User's last name |
| email | string? | Optional email address |
| occupations | Occupation[] | Roles/associations |
| profilePictureUrl | string? | Optional profile image URL |

### Assignment

Game assignment for a referee.

| Field | Type | Description |
|-------|------|-------------|
| __identity | string (UUID) | Unique identifier |
| gameDate | string (ISO date) | Date of the game |
| gameTime | string (HH:mm) | Start time |
| venue | Venue | Location details |
| teamHome | Team | Home team |
| teamAway | Team | Away team |
| role | string | Referee role (1st, 2nd, etc.) |
| status | AssignmentStatus | Current status |
| league | string | League/competition name |

### Compensation

Compensation record for a completed assignment.

| Field | Type | Description |
|-------|------|-------------|
| __identity | string (UUID) | Unique identifier |
| convocationId | string (UUID) | Related assignment |
| distanceInMetres | number | Travel distance |
| amount | number | Compensation amount (CHF) |
| status | string | Processing status |
| correctionReason | string? | Optional correction note |

### Exchange

Assignment exchange/swap request.

| Field | Type | Description |
|-------|------|-------------|
| __identity | string (UUID) | Unique identifier |
| convocation | Assignment | The assignment being exchanged |
| applicants | Referee[] | Referees who applied |
| status | ExchangeStatus | Open, assigned, closed |

## Mobile-Specific Entities

### SecureCredential

Encrypted user credentials for biometric authentication.

| Field | Type | Description |
|-------|------|-------------|
| username | string (encrypted) | User's login username |
| password | string (encrypted) | User's password |
| storedAt | string (ISO datetime) | When credentials were stored |

**Storage**: iOS Keychain (Secure Enclave) / Android Keystore

**Lifecycle**:
- Created when user enables biometric login
- Retrieved on biometric authentication success
- Invalidated when device security settings change
- Deleted on logout or disable biometric

### CachedData

Locally cached assignment and profile data.

| Field | Type | Description |
|-------|------|-------------|
| assignments | Assignment[] | Cached assignment list |
| compensations | Compensation[] | Cached compensations |
| exchanges | Exchange[] | Cached exchanges |
| user | UserProfile | Cached user profile |
| lastSyncAt | string (ISO datetime) | Last successful sync |
| expiresAt | string (ISO datetime) | Cache validity (30 days) |

**Storage**: AsyncStorage (encrypted at rest by OS)

**Lifecycle**:
- Updated on each successful API fetch
- Read when offline or for initial display
- Expired data shown with "Last updated" indicator
- Cleared on logout

### WidgetData

Simplified data passed to home screen widgets.

| Field | Type | Description |
|-------|------|-------------|
| upcomingAssignments | WidgetAssignment[] | Next 3 assignments |
| lastUpdatedAt | string (ISO datetime) | When data was refreshed |

**WidgetAssignment** (subset of Assignment):

| Field | Type | Description |
|-------|------|-------------|
| id | string | Assignment identifier |
| dateTime | string (ISO) | Game date and time |
| venueName | string | Short venue name |
| teams | string | "Home vs Away" |
| role | string | Referee role |

**Storage**:
- iOS: UserDefaults (app group shared with widget extension)
- Android: SharedPreferences

**Lifecycle**:
- Updated whenever main app refreshes assignments
- Widget reads on display (no live fetching)
- Stale after 24 hours (show warning indicator)

### CalendarEventMapping

Tracks locally created calendar events for updates.

| Field | Type | Description |
|-------|------|-------------|
| assignmentId | string (UUID) | VolleyKit assignment ID |
| calendarEventId | string | Device calendar event ID |
| calendarId | string | Target calendar identifier |
| createdAt | string (ISO datetime) | When event was created |
| lastUpdatedAt | string (ISO datetime) | Last sync |

**Storage**: AsyncStorage

**Lifecycle**:
- Created when user adds assignment to calendar
- Updated on manual re-sync
- Orphaned records cleaned up periodically
- Calendar event ID used for updates/deletion

### DepartureReminder

Computed departure alert with route information.

| Field | Type | Description |
|-------|------|-------------|
| assignmentId | string (UUID) | Related assignment |
| userLocation | { lat: number; lng: number } | User's current location |
| venueLocation | { lat: number; lng: number } | Destination venue coordinates |
| calculatedAt | string (ISO datetime) | When route was calculated |
| departureTime | string (ISO datetime) | When user should leave |
| arrivalTime | string (ISO datetime) | Expected arrival at venue |
| travelDurationMinutes | number | Total travel time |
| nearestStop | StopInfo | Closest transit stop to user |
| route | TripLeg[] | Transit route details |
| notificationScheduledAt | string (ISO datetime)? | When notification was scheduled |
| notificationId | string? | Expo notification identifier |

**StopInfo**:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Stop name (e.g., "Hauptbahnhof") |
| distance | number | Distance from user in meters |
| walkTimeMinutes | number | Walking time to stop |

**TripLeg**:

| Field | Type | Description |
|-------|------|-------------|
| mode | string | Transport mode (bus, train, tram, walk) |
| line | string? | Line number (e.g., "31", "S3") |
| direction | string? | Direction/terminus |
| departureTime | string (ISO datetime) | Departure from this leg |
| arrivalTime | string (ISO datetime) | Arrival at next point |
| fromStop | string | Departure stop name |
| toStop | string | Arrival stop name |

**Storage**: AsyncStorage (transient, deleted after assignment)

**Lifecycle**:
- Created when background task calculates route
- Updated hourly when user location changes
- Notification scheduled when within buffer time
- **Deleted when assignment time passes** (per FR-026a)
- No location history retained

### DepartureReminderSettings

User preferences for smart departure reminders.

| Field | Type | Description |
|-------|------|-------------|
| enabled | boolean | Feature toggle |
| bufferMinutes | number | Minutes before departure to notify (5/10/15/20/30, default 15) |
| venueProximityMeters | number | Threshold for "near venue" (default 500) |

**Storage**: AsyncStorage (part of SettingsState)

### VenueCluster

Groups nearby venues for consolidated notifications.

| Field | Type | Description |
|-------|------|-------------|
| assignmentIds | string[] | Grouped assignment IDs |
| centroid | { lat: number; lng: number } | Center point of cluster |
| venueNames | string[] | Names of venues in cluster |

**Note**: Transient, computed when checking multiple same-day assignments. Venues within 500m are grouped.

## State Management

### Zustand Stores (Shared)

```typescript
// AuthStore - no persistence in shared code
interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'error'
  user: UserProfile | null
  dataSource: 'api' | 'demo' | 'calendar'
  error: string | null
}

// SettingsStore - preferences
interface SettingsState {
  language: 'de' | 'en' | 'fr' | 'it'
  biometricEnabled: boolean  // Mobile only
  calendarSyncEnabled: boolean  // Mobile only
  selectedCalendarId: string | null  // Mobile only
  homeLocation: { lat: number; lng: number } | null
  // Smart Departure Reminder settings (Mobile only)
  departureReminderEnabled: boolean
  departureReminderBufferMinutes: 5 | 10 | 15 | 20 | 30  // Default: 15
}
```

### Platform Storage Adapters

```typescript
// Interface for platform-agnostic storage
interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// Interface for secure credential storage
interface SecureStorageAdapter {
  setCredentials(username: string, password: string): Promise<void>
  getCredentials(): Promise<{ username: string; password: string } | null>
  clearCredentials(): Promise<void>
  hasCredentials(): Promise<boolean>
}

// Interface for biometric authentication
interface BiometricAdapter {
  isAvailable(): Promise<boolean>
  authenticate(promptMessage: string): Promise<boolean>
  getBiometricType(): Promise<'faceId' | 'touchId' | 'fingerprint' | null>
}

// Interface for location tracking (Mobile only)
interface LocationAdapter {
  requestPermissions(): Promise<'granted' | 'denied' | 'restricted'>
  getCurrentLocation(): Promise<{ lat: number; lng: number } | null>
  startBackgroundTracking(taskName: string): Promise<void>
  stopBackgroundTracking(): Promise<void>
  isTrackingActive(): Promise<boolean>
}

// Interface for local notifications (Mobile only)
interface NotificationAdapter {
  requestPermissions(): Promise<boolean>
  scheduleNotification(options: {
    title: string
    body: string
    triggerAt: Date
    data?: Record<string, unknown>
  }): Promise<string>  // Returns notification ID
  cancelNotification(id: string): Promise<void>
  cancelAllNotifications(): Promise<void>
}

// Interface for departure reminder service (Mobile only)
interface DepartureReminderService {
  calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    arrivalTime: Date
  ): Promise<TripResult | null>

  isNearVenue(
    userLocation: { lat: number; lng: number },
    venueLocation: { lat: number; lng: number }
  ): boolean

  clusterNearbyVenues(
    assignments: Assignment[]
  ): VenueCluster[]

  scheduleReminderNotification(
    reminder: DepartureReminder,
    bufferMinutes: number
  ): Promise<string>  // Returns notification ID
}
```

## Validation Rules

### From Spec Requirements

| Rule | Entity | Validation |
|------|--------|------------|
| FR-004 | SettingsState.language | Must be 'de', 'en', 'fr', or 'it' |
| FR-009 | SecureCredential | Must use device secure enclave |
| FR-018 | CachedData | Must cache 30 days of assignments |
| FR-019 | CachedData | Must track lastSyncAt |
| FR-021 | DepartureReminder | Track location only when assignments within 6 hours |
| FR-023 | DepartureReminderSettings.bufferMinutes | Must be 5, 10, 15, 20, or 30 |
| FR-024 | VenueCluster | Venues within 500m grouped together |
| FR-026a | DepartureReminder | Delete location data after assignment completed |

### Cache Validation

```typescript
function isCacheValid(cachedData: CachedData): boolean {
  const now = new Date()
  const expiry = new Date(cachedData.expiresAt)
  return now < expiry
}

function isCacheStale(cachedData: CachedData, thresholdHours = 24): boolean {
  const now = new Date()
  const lastSync = new Date(cachedData.lastSyncAt)
  const diff = now.getTime() - lastSync.getTime()
  return diff > thresholdHours * 60 * 60 * 1000
}
```
