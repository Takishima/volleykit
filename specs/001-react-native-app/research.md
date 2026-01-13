# Research: React Native Mobile App

**Date**: 2026-01-13
**Feature**: 001-react-native-app

## 1. React Native Framework Choice

### Decision: Expo (managed workflow with prebuild)

### Rationale
- Expo SDK provides native modules for all required features (biometrics, calendar, secure storage)
- Managed workflow simplifies builds for iOS and Android
- Prebuild ("bare workflow lite") allows ejecting native code when needed for widgets
- Over-the-air updates for JavaScript changes (faster iteration than app store updates)
- Active community and well-maintained libraries

### Alternatives Considered
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Bare React Native | Full native control | Complex setup, manual linking | Unnecessary complexity for our feature set |
| Expo Go | Fastest iteration | Can't use custom native modules (widgets) | Widget requirement needs prebuild |
| Flutter | Good cross-platform | Different language (Dart), no code sharing with web | No TypeScript/React code sharing possible |

## 2. Code Sharing Strategy

### Decision: Monorepo package extraction with platform adapters

### Rationale
- Existing PWA code is well-structured (feature-based folders, separation of concerns)
- API client, Zustand stores, and utilities are mostly platform-agnostic
- React hooks can be shared with minimal changes (TanStack Query works in RN)
- Platform differences isolated to adapters (storage, auth flow, native features)

### What Can Be Shared (Target: 70%+)
| Category | Shareable | Notes |
|----------|-----------|-------|
| API client | Yes | Replace `fetch` imports, abstract CORS proxy |
| OpenAPI types | Yes | Generated schema.ts is platform-agnostic |
| Zod validation | Yes | Works identically |
| TanStack Query | Yes | Same hooks, different cache persistence |
| Zustand stores | Partially | State logic yes, persist middleware needs adapter |
| Translations | Yes | Same JSON files, different hook wrapper |
| Date utilities | Yes | date-fns is platform-agnostic |
| Business logic | Yes | Assignment helpers, calculations |

### What Needs Platform-Specific Implementation
| Feature | Web Implementation | Mobile Implementation |
|---------|-------------------|----------------------|
| Storage | localStorage | AsyncStorage + SecureStore |
| Auth flow | Redirect + form post | In-app WebView or direct API |
| Biometrics | N/A | expo-local-authentication |
| Calendar | URL scheme (PWA) | expo-calendar + URL scheme |
| Widgets | N/A | react-native-widgetkit / android-widget |
| Navigation | react-router-dom | @react-navigation/native |
| Styling | Tailwind CSS | StyleSheet / NativeWind |

## 3. State Persistence

### Decision: Zustand without persist middleware, platform adapters

### Rationale
- Zustand's persist middleware uses localStorage by default (web-only)
- Creating platform-agnostic stores without persist middleware
- Persistence handled by platform-specific storage adapters
- Hydration triggered on app start with platform-specific storage

### Implementation Pattern
```typescript
// packages/shared/stores/auth.ts
export const createAuthStore = () => create<AuthState>((set) => ({
  // State without persistence logic
}))

// packages/mobile/platform/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
export const hydrateStore = async (store) => {
  const data = await AsyncStorage.getItem('auth')
  if (data) store.setState(JSON.parse(data))
}
```

## 4. Biometric Authentication

### Decision: expo-secure-store + expo-local-authentication

### Rationale
- expo-secure-store uses iOS Keychain with Secure Enclave, Android Keystore
- expo-local-authentication triggers biometric prompts
- Credentials stored encrypted, unlocked by biometrics
- Matches spec requirement: foreground-only access, no background

### Flow
1. User enables biometric login → credentials encrypted in SecureStore
2. App launch with expired session → prompt for biometrics
3. Biometrics success → retrieve credentials, perform fresh login
4. 3 failures → fall back to manual password entry

### Security Considerations
- Credentials invalidated when device security settings change (iOS automatic)
- No plaintext credential storage ever
- Biometric authentication requires device passcode as fallback

## 5. Calendar Integration

### Decision: expo-calendar for direct events, URL scheme for iCal

### Rationale
- expo-calendar provides full access to device calendars (read/write)
- Direct event creation matches spec FR-014
- iCal subscription uses standard webcal:// URL scheme (FR-013)
- Deep linking from calendar events uses app URL scheme

### Implementation
| Feature | Method |
|---------|--------|
| iCal subscription | Open `webcal://` URL → device calendar handles |
| Direct events | expo-calendar createEventAsync() per assignment |
| Event updates | Track event IDs, update or recreate on re-sync |
| Deep link | Register URL scheme, parse assignment ID from URL |

## 6. Home Screen Widgets

### Decision: react-native-widgetkit (iOS) + react-native-android-widget (Android)

### Rationale
- WidgetKit (iOS 14+) and App Widgets (Android) have different APIs
- Libraries provide React Native bridges to native widget systems
- Widgets display cached data (no live fetching due to session constraints)
- Widget updates triggered when app refreshes data

### Constraints
- Widgets cannot make authenticated API calls (session tokens expire)
- Data passed to widgets via UserDefaults (iOS) / SharedPreferences (Android)
- Update frequency limited by OS (15min minimum on iOS)

### Implementation
- Create native widget extensions (Swift for iOS, Kotlin for Android)
- React Native bridges for data passing
- Widget shows: next 3 assignments, date, location, "Last updated" timestamp

## 7. Navigation

### Decision: React Navigation 6 with native stack

### Rationale
- Industry standard for React Native navigation
- Native stack navigator for 60fps transitions
- Tab navigation for main sections (matches PWA bottom nav)
- Deep linking support for widget and calendar integration

### Screen Structure
```
TabNavigator
├── Assignments (stack)
│   ├── AssignmentsList
│   └── AssignmentDetail
├── Compensations (stack)
│   ├── CompensationsList
│   └── CompensationDetail
├── Exchanges (stack)
│   ├── ExchangesList
│   └── ExchangeDetail
└── Settings (stack)
    ├── SettingsMain
    ├── BiometricSettings
    └── CalendarSettings
```

## 8. Styling Approach

### Decision: NativeWind (Tailwind CSS for React Native)

### Rationale
- Existing PWA uses Tailwind CSS 4
- NativeWind allows sharing utility class names
- Reduces learning curve for developers familiar with web codebase
- Falls back to StyleSheet for native-specific needs

### Alternatives Considered
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| StyleSheet only | Native, performant | Different from web, no class sharing | Increases maintenance burden |
| Styled Components | Familiar JS-in-CSS | Runtime overhead, different from Tailwind | Doesn't match existing patterns |
| Tamagui | Cross-platform, fast | Learning curve, young ecosystem | Overkill for feature set |

## 9. Testing Strategy

### Decision: Jest + React Native Testing Library (unit), Detox (E2E)

### Rationale
- Jest works with existing Vitest test patterns (compatible APIs)
- React Native Testing Library mirrors web Testing Library
- Detox provides reliable E2E testing on real simulators/devices
- Shared test utilities for platform-agnostic code

### Test Distribution
| Type | Tool | Target |
|------|------|--------|
| Unit tests | Jest + RNTL | Shared code, components |
| Integration tests | Jest | Store + API interactions |
| E2E tests | Detox | Critical user flows |
| Contract tests | Jest | API validation (existing) |

## 10. Build and Distribution

### Decision: EAS Build + EAS Submit

### Rationale
- Expo Application Services (EAS) handles iOS and Android builds
- Managed signing certificates and provisioning
- Automated app store submissions
- Preview builds for testing before release

### Distribution Plan
1. **Development**: Expo Go + development builds
2. **Testing**: Internal TestFlight (iOS), Internal Testing (Android)
3. **Production**: App Store, Google Play Store

### CI/CD Integration
- GitHub Actions triggers EAS Build
- Automatic preview builds for PRs
- Production builds on main branch tags

## 11. Smart Departure Reminder - Location Tracking

### Decision: expo-location with background permissions + expo-task-manager

### Rationale
- expo-location provides cross-platform geolocation APIs
- expo-task-manager enables background task execution
- Hourly location updates match spec requirement (battery-efficient)
- Significant location change monitoring as alternative (more battery efficient)

### Implementation
| Feature | iOS | Android |
|---------|-----|---------|
| Background location | CLLocationManager | FusedLocationProviderClient |
| Permissions | NSLocationWhenInUseUsageDescription, NSLocationAlwaysUsageDescription | ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION |
| Frequency | Significant location change or timer | WorkManager periodic task |

### Battery Optimization
- Use `Accuracy.Balanced` (not `Accuracy.BestForNavigation`)
- Hourly checks only when assignments within 6 hours
- Stop tracking after assignment time passes
- Respect iOS/Android battery saver modes

### Alternatives Considered
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Continuous GPS | Real-time accuracy | Severe battery drain | Unnecessary for hourly checks |
| Geofencing only | Battery efficient | Can't calculate routes from arbitrary location | Need location for OJP routing |
| Push notifications | Server-side scheduling | No server infrastructure | Out of scope per spec |

## 12. OJP SDK Integration for React Native

### Decision: HTTP-based OJP API calls with existing web SDK patterns

### Rationale
- OJP SDK already exists in PWA (`web-app/src/shared/services/transport/`)
- REST/XML API calls are platform-agnostic
- Share OJP client code between web and mobile via packages/shared
- No native module needed for HTTP requests

### Implementation
```typescript
// packages/shared/services/transport/ojp-client.ts
// Existing OJP client is platform-agnostic (uses fetch)
// Can be shared directly with React Native

interface TripRequest {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  departureTime?: Date
  arrivalTime?: Date
}

interface TripResult {
  departureTime: Date
  arrivalTime: Date
  duration: number
  legs: TripLeg[]
  nearestStop: StopInfo
}
```

### Key Considerations
- OJP API returns Swiss public transport routes
- Cache route calculations to reduce API calls
- Handle offline gracefully (fall back to time-based reminder)
- Rate limit: respect OJP API limits

## 13. Local Notifications

### Decision: expo-notifications for local notification scheduling

### Rationale
- expo-notifications provides cross-platform notification API
- Local notifications don't require server infrastructure
- Can be scheduled based on calculated departure time
- Deep linking support for notification tap actions

### Implementation
| Feature | Method |
|---------|--------|
| Schedule notification | scheduleNotificationAsync() |
| Departure alert | Trigger at (assignment_time - travel_duration - buffer) |
| Notification content | Nearest stop, line number, direction, departure time |
| Deep link | Open assignment detail on tap |

### Notification Content Template
```
🚌 Leave for [Venue] in 15 min
Take Bus 31 from Hauptbahnhof (direction: Flughafen)
Departure: 14:23 → Arrival: 15:05
```

### Permissions
- iOS: Request notification permission on first enable
- Android: POST_NOTIFICATIONS (Android 13+)

## 14. Venue Proximity Detection

### Decision: Haversine distance calculation with 500m threshold

### Rationale
- Simple distance calculation from user location to venue coordinates
- 500m threshold accounts for GPS drift (~10-50m accuracy)
- No geofencing needed (simpler, less battery impact)
- Venue coordinates available from Assignment.venue

### Implementation
```typescript
function isNearVenue(
  userLocation: { lat: number; lng: number },
  venueLocation: { lat: number; lng: number },
  thresholdMeters: number = 500
): boolean {
  const distance = haversineDistance(userLocation, venueLocation)
  return distance <= thresholdMeters
}

function haversineDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  // Standard haversine formula
  // Returns distance in meters
}
```

### Venue Clustering for Multiple Assignments
- Group assignments with venues ≤500m apart
- Calculate centroid for grouped venues
- Single notification for venue cluster

## 15. Departure Reminder Data Flow

### Decision: Background task → OJP calculation → Local notification

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Departure Reminder Flow                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Hourly     │    │   Location   │    │   Check      │  │
│  │   Background │───▶│   Update     │───▶│   Upcoming   │  │
│  │   Task       │    │              │    │   Assignments│  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                  │          │
│                                                  ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Schedule   │    │   Calculate  │    │   Check      │  │
│  │   Local      │◀───│   Departure  │◀───│   Venue      │  │
│  │   Notification│    │   Time       │    │   Proximity  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   ▲                              │
│         │            ┌──────┴───────┐                      │
│         │            │   OJP SDK    │                      │
│         │            │   Route Calc │                      │
│         │            └──────────────┘                      │
│         ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Notification: "Leave in 15min - Bus 31 @ 14:23"   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Retention
- Location stored only until assignment completed
- No location history maintained
- DepartureReminder entity deleted after assignment time
