# VolleyKit Mobile

React Native mobile app for iOS and Android.

## Tech Stack

- React Native 0.81 + Expo 54
- NativeWind (Tailwind for React Native)
- React Navigation 7
- TanStack Query 5 (with persistence)
- @volleykit/shared (shared business logic)

## Features

- Assignment list with pull-to-refresh
- Biometric authentication (Face ID / fingerprint)
- Push notifications for new assignments
- Calendar integration
- iOS widgets (WidgetKit)
- Offline support with query persistence

## Development

```bash
npm start             # Start Expo dev server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run prebuild      # Generate native projects
```

## Project Structure

```
src/
├── screens/          # Screen components
├── components/       # Shared UI components
├── navigation/       # Navigation configuration
├── hooks/            # Mobile-specific hooks
├── services/         # Native services (notifications, etc.)
├── stores/           # Mobile-specific stores
└── platform/         # Platform-specific code
```

## Building

```bash
# Development builds
eas build --profile development --platform ios
eas build --profile development --platform android

# Production builds
eas build --profile production --platform all
```

See `eas.json` for build profiles.
