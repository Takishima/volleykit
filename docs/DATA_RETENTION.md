# Data Retention

VolleyKit stores certain data locally in your browser to provide a better user experience.
This data never leaves your device and is not transmitted to our servers.

## What We Store

### Settings (`volleykit-settings` in localStorage)

| Data | Purpose | Retention |
|------|---------|-----------|
| Home location (coordinates + label) | Filter exchanges by distance/travel time | Until cleared by user |
| Distance filter preferences | Remember your max distance setting | Until cleared by user |
| Travel time filter preferences | Remember your max travel time setting | Until cleared by user |
| Transport enabled toggle | Remember if you enabled public transport | Until cleared by user |
| Language preference | Display app in your preferred language | Until cleared by user |
| Safe mode setting | Prevent accidental actions | Until cleared by user |

### Travel Time Cache (TanStack Query cache in memory/localStorage)

| Data | Purpose | Retention |
|------|---------|-----------|
| Travel times to sports halls | Avoid repeated API calls | 14 days, auto-expires |

### Authentication (`volleykit-auth` in localStorage)

| Data | Purpose | Retention |
|------|---------|-----------|
| Demo mode flag | Remember demo mode state | Until logout |
| Association code | Multi-association support | Until logout |

**Note**: Session credentials are stored in httpOnly cookies managed by the API,
not in localStorage. We never store passwords or authentication tokens locally.

### Demo Data (`volleykit-demo` in localStorage)

| Data | Purpose | Retention |
|------|---------|-----------|
| Modified demo assignments | Persist demo mode changes | Until reset or logout |
| Modified demo compensations | Persist demo mode changes | Until reset or logout |
| Modified demo exchanges | Persist demo mode changes | Until reset or logout |

## How to Clear Your Data

### In the App

1. Go to **Settings** in the app
2. Scroll to **Data & Privacy**
3. Tap **Clear Local Data**

### Manually via Browser

- **Chrome**: Settings > Privacy > Clear browsing data > Cookies and site data
- **Firefox**: Settings > Privacy > Cookies and Site Data > Clear Data
- **Safari**: Settings > Privacy > Manage Website Data > Remove

## External Services

### Swiss Public Transport API

When you enable public transport calculations, your home location coordinates
are sent to the Swiss public transport API (opentransportdata.swiss) to calculate
travel times. This is only done when:

- You explicitly enable transport calculations in Settings
- You have set a home location

The transport API is operated by the Swiss Federal Office of Transport.
See their privacy policy at: https://opentransportdata.swiss/en/terms-of-use/

### Geocoding (Address Search)

When you search for an address in the home location settings, your search query
is sent to Nominatim (OpenStreetMap's geocoding service) to convert addresses
to coordinates. No personal data is transmitted beyond the search query itself.

See their usage policy at: https://operations.osmfoundation.org/policies/nominatim/

## Data Flow Diagram

```
┌─────────────────────┐
│   Your Browser      │
├─────────────────────┤
│ localStorage:       │
│ - Settings          │
│ - Auth state        │  No data sent to
│ - Demo data         │  VolleyKit servers
│ - Travel time cache │
└─────────────────────┘
         │
         │ (when enabled)
         ▼
┌─────────────────────────────┐
│ opentransportdata.swiss     │
│ (Swiss public transport)    │
│ - Receives: coordinates     │
│ - Returns: travel times     │
└─────────────────────────────┘
         │
         │ (when searching address)
         ▼
┌─────────────────────────────┐
│ nominatim.openstreetmap.org │
│ (Geocoding service)         │
│ - Receives: address query   │
│ - Returns: coordinates      │
└─────────────────────────────┘
         │
         │ (API calls)
         ▼
┌─────────────────────────────┐
│ volleymanager.volleyball.ch │
│ (Swiss Volley API)          │
│ - Your assignments          │
│ - Your compensations        │
│ - Exchange listings         │
└─────────────────────────────┘
```

## Questions?

If you have questions about data retention or privacy, please open an issue at:
https://github.com/Takishima/volleykit/issues
