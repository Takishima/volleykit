# API Contracts

**Date**: 2026-01-13
**Feature**: 001-react-native-app

## Overview

The React Native mobile app reuses the existing API contracts from the PWA.

## Existing Contracts

The SwissVolley API is fully documented in:

- **OpenAPI Specification**: `docs/api/volleymanager-openapi.yaml`
- **Generated Types**: `packages/shared/api/schema.ts` (generated from OpenAPI)
- **Endpoint Documentation**: `docs/api/*_api.md`

## API Endpoints Used

All endpoints from the PWA are reused in the mobile app:

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `/authentication/authenticate` | POST |
| Assignments | `/api/refereeconvocation/searchMyRefereeConvocations` | POST |
| Compensations | `/api/refereeconvocationcompensation/search` | POST |
| Exchanges | `/api/refereegameexchange/search` | POST |
| Settings | `/api/refereeassociationsettings/...` | GET |
| Calendar | iCal feed URL (read-only) | GET |

## Mobile-Specific Considerations

### Authentication

The mobile app uses the same authentication flow as the PWA:
1. Fetch CSRF token from login page
2. Submit credentials via form POST
3. Extract session token from redirect

Biometric authentication stores credentials locally and performs a fresh login.

### CORS Proxy

The mobile app can optionally bypass the CORS proxy since:
- Native HTTP clients don't have same-origin restrictions
- Direct API access may improve performance

However, using the proxy maintains parity with web and simplifies session handling.

## No New Contracts

This feature does not introduce new API endpoints. All functionality uses existing contracts.

Mobile-specific features (biometrics, calendar, widgets) are implemented locally:
- **Biometrics**: Device Secure Enclave (no API)
- **Calendar**: expo-calendar native module (no API)
- **Widgets**: Local storage bridge (no API)
