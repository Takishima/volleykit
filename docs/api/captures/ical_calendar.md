# iCal Calendar Export

## Overview

Referees can subscribe to their assignments calendar using an iCal URL. This allows syncing assignments to phone calendars, Google Calendar, Outlook, etc.

## Endpoint

```
GET /indoor/iCal/referee/<user-token>
```

**Protocols:**

- `webcal://volleymanager.volleyball.ch/indoor/iCal/referee/<user-token>` (for mobile apps)
- `https://volleymanager.volleyball.ch/indoor/iCal/referee/<user-token>` (direct HTTP access)

## User Token

Each referee has a unique token (e.g., `XXXXXX`) that identifies their calendar feed. This token:

- Is unique per referee
- Does not expire (persistent URL)
- Requires no authentication (public URL with obscure token)
- Should be kept private (anyone with the URL can see assignments)

## Response Format

Standard iCal (.ics) format containing:

- All upcoming referee assignments
- Event details: date, time, location, teams, role

**Content-Type:** `text/calendar; charset=utf-8`

## Example Response (Hypothesized)

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VolleyManager//Referee Calendar//EN
X-WR-CALNAME:Mes convocations arbitre
BEGIN:VEVENT
UID:convocation-<uuid>@volleymanager.volleyball.ch
DTSTART:20251214T123000
DTEND:20251214T153000
SUMMARY:ARB 1 - City Volley Basel vs City Volley Basel H6
LOCATION:Basel (8FV9HH3P+PH)
DESCRIPTION:Match #379423\nLigue: 4L\nARB 1: [Referee Name]
END:VEVENT
END:VCALENDAR
```

## UI Access

The calendar URL is accessible via:

1. Click "Calendrier internet" button on the assignments page
1. A popup shows:
   - "abonnement iCal" link (opens webcal:// protocol)
   - Text field with the HTTPS URL for copying
   - Copy button

## Notes

- The calendar updates automatically as assignments change
- No API call is made when opening the popup (URL is pre-loaded)
- The token format appears to be 6 alphanumeric characters
