# Help Site Screenshot Capture

This document explains how to capture screenshots for the help site documentation.

## Quick Start

```bash
cd web-app

# Install Playwright browser
npx playwright install chromium

# Build the app
npm run build

# Capture screenshots
npm run screenshots:help
```

## What Gets Captured

The script captures these screenshots in `help-site/public/images/screenshots/`:

| Screenshot                  | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `login-page-{device}.png`   | Login page (desktop, tablet, phone)                                      |
| `calendar-mode-login.png`   | Calendar mode entry on login page                                        |
| `assignments-list.png`      | Main assignments list                                                    |
| `assignment-detail.png`     | Expanded assignment card with spotlight                                  |
| `assignment-actions.png`    | Swipe left actions (validate/edit/report) on 1st ref card with spotlight |
| `exchange-list.png`         | Exchange board                                                           |
| `exchange-request.png`      | Swipe right to exchange with spotlight                                   |
| `compensations-list.png`    | Compensation list                                                        |
| `settings-overview.png`     | Full settings page                                                       |
| `language-settings.png`     | Language selection in settings                                           |
| `home-location-setting.png` | Home location input with spotlight                                       |
| `data-privacy-settings.png` | Data retention section with spotlight                                    |

## Travel Time Screenshots (Manual)

Travel screenshots require the production site with OJP API configured. Run from your local machine:

```bash
# Set PRODUCTION_URL and run specific travel tests
PRODUCTION_URL=https://takishima.github.io/volleykit/ \
  npx playwright test e2e/capture-screenshots.spec.ts \
  --project=chromium \
  -g "travel-time|journey-details"
```

This captures:

- `travel-time-display.png` - Travel time on assignment card
- `journey-details.png` - Expanded journey details

## Skipped Screenshots

Some screenshots require manual capture or specific conditions:

| Screenshot                  | Reason                                |
| --------------------------- | ------------------------------------- |
| `compensations-filters.png` | Filters not available in demo mode    |
| `install-prompt.png`        | PWA install prompt (browser-specific) |
| `offline-indicator.png`     | Requires network simulation           |
| `update-prompt.png`         | Requires service worker update        |

## Customization

### Running Individual Tests

```bash
# Run a specific screenshot test
npx playwright test e2e/capture-screenshots.spec.ts \
  --project=chromium \
  -g "assignment-detail"
```

### Adding Spotlight Effect

The script includes a spotlight helper that creates a dark overlay with a hole around the highlighted element:

```typescript
await takeSpotlightScreenshot(page, 'screenshot-name', '[data-tour="element"]', 8)
```

### Device Viewports

```typescript
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 667 },
}
```

## Troubleshooting

### PWA Notification Blocking Screenshots

The script automatically dismisses PWA "offline ready" notifications. If they still appear, increase the wait time in `dismissPWANotification()`.

### Tour Overlays Appearing

Tours are automatically dismissed via localStorage setup. If they still appear, ensure `setupCleanEnvironment(page)` is called before navigating.

### Swipe Actions Not Showing

Ensure the swipe distance is at least 30% of card width to trigger the drawer. The script uses 40% for reliability.
