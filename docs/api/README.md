# VolleyManager API Documentation

This directory contains detailed documentation of the VolleyManager API endpoints, captured from observing the real website behavior.

## Purpose

To create an accurate mock API for local testing that behaves exactly like the production VolleyManager system.

## Files

- `assignments_api.md` - Referee assignments/convocations endpoint
- `compensations_api.md` - Compensation/travel expenses endpoint
- `exchanges_api.md` - Game exchange/substitution endpoint
- `auth_api.md` - Authentication and session management
- `misc_api.md` - Other supporting endpoints (seasons, settings, etc.)

## Base URL

```
https://volleymanager.volleyball.ch
```

## Authentication

The API uses cookie-based session authentication:

- Cookie name: `Neos_Flow_Session`
- Login via form POST to `/login`
- Session maintained via cookies on all subsequent requests

## Common Headers

```
Content-Type: application/x-www-form-urlencoded
```

## Date Formats

- Request dates: `YYYY-MM-DD` (ISO 8601)
- Response dates: `YYYY-MM-DDTHH:mm:ss+HH:MM` (ISO 8601 with timezone)

## Pagination

All search endpoints support pagination via:

```
pagination[page]: 1
pagination[itemsPerPage]: 50
```
