# Quickstart Guide: React Native Mobile App

**Date**: 2026-01-13
**Feature**: 001-react-native-app

## Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later (comes with Node.js)
- **Xcode** 15+ (for iOS development, macOS only)
- **Android Studio** Hedgehog or later (for Android development)
- **Expo CLI**: Installed globally or via npx

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd volleykit

# Install root dependencies (includes workspace tooling)
npm install

# Install all workspace packages
npm install --workspaces
```

### 2. Environment Setup

Create environment files for each platform:

```bash
# For mobile app
cp packages/mobile/.env.example packages/mobile/.env.local
```

Required environment variables:
```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://volleymanager.volleyball.ch
EXPO_PUBLIC_PROXY_URL=https://your-proxy-worker.workers.dev

# App Configuration
EXPO_PUBLIC_APP_SCHEME=volleykit
```

### 3. iOS Setup (macOS only)

```bash
# Install iOS dependencies
cd packages/mobile
npx expo prebuild --platform ios
cd ios && pod install && cd ..

# Start iOS simulator
npx expo run:ios
```

### 4. Android Setup

```bash
# Install Android dependencies
cd packages/mobile
npx expo prebuild --platform android

# Start Android emulator
npx expo run:android
```

### 5. Development with Expo Go (Limited Features)

For quick iteration without native modules (widgets won't work):

```bash
cd packages/mobile
npx expo start
```

Scan QR code with Expo Go app on your device.

## Project Structure

```
volleykit/
├── packages/
│   ├── shared/           # Shared code (API, stores, utils)
│   ├── web/              # PWA (renamed from web-app/)
│   └── mobile/           # React Native app
├── docs/                 # Documentation
├── specs/                # Feature specifications
└── package.json          # Workspace root
```

## Development Workflow

### Running the Mobile App

```bash
# Development build (iOS)
npm run mobile:ios

# Development build (Android)
npm run mobile:android

# Start Metro bundler only
npm run mobile:start
```

### Running Tests

```bash
# All tests
npm test

# Mobile tests only
npm run test:mobile

# Shared package tests
npm run test:shared

# E2E tests (requires running simulator)
npm run test:e2e:mobile
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format all packages
npm run format

# Check formatting
npm run format:check
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run mobile:ios` | Run iOS development build |
| `npm run mobile:android` | Run Android development build |
| `npm run mobile:start` | Start Metro bundler |
| `npm run shared:build` | Build shared package |
| `npm run shared:test` | Test shared package |
| `npm run generate:api` | Regenerate API types from OpenAPI |

## Architecture Notes

### Platform Adapters

Platform-specific code is isolated in adapter modules:

```typescript
// packages/mobile/src/platform/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
}
```

### Using Shared Code

Import from the shared package:

```typescript
// In mobile app
import { useAssignments, useAuth } from '@volleykit/shared'
import { api, type Assignment } from '@volleykit/shared/api'
import { t } from '@volleykit/shared/i18n'
```

### Adding Native Features

1. Create adapter interface in shared package (if applicable)
2. Implement platform-specific code in `packages/mobile/src/platform/`
3. Inject implementation via React Context at app root

## Troubleshooting

### Common Issues

**Metro bundler fails to start**
```bash
# Clear Metro cache
npx expo start --clear
```

**iOS build fails**
```bash
# Clean and reinstall pods
cd packages/mobile/ios
rm -rf Pods Podfile.lock
pod install --repo-update
```

**Android build fails**
```bash
# Clean Gradle cache
cd packages/mobile/android
./gradlew clean
```

**Module not found errors**
```bash
# Rebuild shared package
npm run shared:build

# Restart Metro with cache clear
npx expo start --clear
```

## Next Steps

1. Review [research.md](./research.md) for architectural decisions
2. Review [data-model.md](./data-model.md) for entity definitions
3. Run `/speckit.tasks` to generate implementation tasks
4. Start with shared package extraction (highest priority)
