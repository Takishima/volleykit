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

## Language Variants

The iCal feed is localized based on the user's language preference. Key differences:

| Field | French | German |
|-------|--------|--------|
| Calendar name | `Convocations d'arbitre` | `SR-Aufgebote` |
| Referee role in SUMMARY | `ARB 1`, `ARB 2` | `1. SR`, `2. SR` |
| Line referee role | `JL 1`, `JL 2` | `1. LR`, `2. LR` |
| Role label | `Engagé en tant que:` | `Einsatz als:` |
| Match label | `Match:` | `Spiel:` |
| League label | `Ligue:` | `Liga:` |
| Hall label | `Salle:` | `Halle:` |
| Address label | `Adresse:` | `Adresse:` |
| Home team | `Equipe recevante:` | `Heimteam:` |
| Away team | `Equipe visiteuse:` | `Gastteam:` |
| Team manager | `Responsable d'équipe:` | `Teamverantwortlicher:` |
| Convener | `Convocateur:` | `Aufbieter:` |
| Assigned referees | `ARB convoqués:` | `Aufgebotene SR:` |
| No convener | `Aucun convocateur (convocation de la bourse)` | `Kein Aufbieter (Aufgebot aus der SR-Börse)` |

## Real Examples

### French iCal Event (Captured 2026-01-05)

```ics
BEGIN:VEVENT
UID:referee-convocation-for-game-392936
SUMMARY:ARB 1 | TV St. Johann - VTV Horw 1 (Mobilière Volley Cup)
DESCRIPTION:Engagé en tant que: ARB 1\n\nMatch: #392936 | 11.09.2025 20:15
  | TV St. Johann — VTV Horw 1\nLigue: #6758 | Mobilière Volley Cup |
 ♀\n\nSalle: #1477 | TH St. Johann (E)\nAdresse: Spitalstrasse 50\, 4056
 Basel\nhttps://maps.google.com/?q=8FV9HH8J%2B49&hl=fr\n\nEquipe recevante:
  #10008 | TV St. Johann (3L\,  ♀\, SVRBA)\n	Responsable d'équipe: Sara
 Gürtler | sara_guertler@bluewin.ch | +41796218933\n	Responsable d'équipe
 : Marianne Lorentz | mariannelorentz@yahoo.de | +41798172050\n\nEquipe vis
 iteuse: #3813 | VTV Horw 1 (3L\,  ♀\, SVRI)\n	Responsable d'équipe: Mar
 tina Frei | martina.frei@hotmail.com | +41795808953\n\nConvocateur: \n	Hug
 o Spahni | hugo.spahni@bluewin.ch | +41786130823\n\nARB convoqués:\n	ARB
 1: Damien Nguyen | ngn.damien@gmail.com | +41786795571\n
LOCATION:Spitalstrasse 50\, 4056 Basel\, Suisse
DTSTART;TZID=UTC:20250911T181500
DTEND;TZID=UTC:20250911T201500
DTSTAMP;TZID=UTC:20260105T120008
GEO:47.5652951;7.5809563
X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=Spitalstrasse 50\, 4056 Bas
 el\, Suisse;X-APPLE-RADIUS=72;X-TITLE=TH St. Johann:47.5652951;7.5809563
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT60M
END:VALARM
END:VEVENT
```

### German iCal Event (Captured 2026-01-05)

```ics
BEGIN:VEVENT
UID:referee-convocation-for-game-377762
SUMMARY:1. SR | Volley Amriswil - Lausanne UC (NLA)
DESCRIPTION:Einsatz als: 1. SR\n\nSpiel: #377762 | 11.10.2025 17:00 | Volle
 y Amriswil — Lausanne UC\nLiga: #6607 | NLA | ♂\n\nHalle: #10 | Tellen
 feld B (A)\nAdresse: Untere Grenzstrasse 10\, 8580 Amriswil\nhttps://maps.
 google.com/?q=8FVFG7XQ%2BCP&hl=de\n\nHeimteam: #20 | Volley Amriswil (NLA\
 ,  ♂\, SV)\n	Teamverantwortlicher: Alvaro Jurado Moreno | alvaro.juradom
 3@gmail.com | \n	Teamverantwortlicher: Gesa Osterwald | gesa.osterwald@vol
 leyamriswil.ch | +41766890060\n\nGastteam: #4 | Lausanne UC (NLA\,  ♂\,
 SV)\n	Teamverantwortlicher: Philippe Ducommun | philippe@lucvolleyball.ch
 | +41796372064\n\nAufbieter: \n	Philippe Weinberger | philippe.weinberger@
 axa.ch | +41792136008\n\nAufgebotene SR:\n	1. SR: Laura Rüegg | laura.ru
 eegg@me.com | +41796558486\n	2. SR: Alfio Sanapo | alfiosan70@gmail.com |
 +41796194374\n	1. LR: Martin Auricht | administration@volleyaadorf.ch | +4
 1764808808\n	2. LR: Sepp Signer | signer-inauen@bluewin.ch | +41764138087\
 n
LOCATION:Untere Grenzstrasse 10\, 8580 Amriswil\, Schweiz
DTSTART;TZID=UTC:20251011T150000
DTEND;TZID=UTC:20251011T170000
DTSTAMP;TZID=UTC:20260105T120042
GEO:47.5486134;9.2893436
X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=Untere Grenzstrasse 10\, 85
 80 Amriswil\, Schweiz;X-APPLE-RADIUS=72;X-TITLE=Tellenfeld B:47.5486134;9.
 2893436
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT60M
END:VALARM
END:VEVENT
```

## Parsed Fields

### From SUMMARY

Format: `{role} | {homeTeam} - {awayTeam} ({league})`

- **Role**: `ARB 1`, `ARB 2` (French) or `1. SR`, `2. SR` (German)
- **Home team**: Text before ` - `
- **Away team**: Text after ` - ` and before ` (`
- **League**: Text in parentheses at end

### From DESCRIPTION

The description contains structured data in `Label: Value` format, separated by `|`:

| Pattern | Example | Extracted Value |
|---------|---------|-----------------|
| `Match: #{id}` / `Spiel: #{id}` | `Match: #392936` | Game number: `392936` |
| `Ligue: #{id} \| {category} \| {gender}` | `Ligue: #6758 \| Mobilière Volley Cup \| ♀` | League category, gender symbol |
| `Salle: #{id} \| {name}` / `Halle: #{id} \| {name}` | `Salle: #1477 \| TH St. Johann (E)` | Hall ID: `1477`, Hall name |
| `ARB 1: {name} \| {email} \| {phone}` | `ARB 1: Damien Nguyen \| ngn.damien@gmail.com \| +41786795571` | Referee name |
| `1. SR: {name} \| {email} \| {phone}` | `1. SR: Laura Rüegg \| laura.rueegg@me.com \| +41796558486` | Referee name (German) |
| `Equipe recevante: #{id} \| {team} ({cat}, {gender}, {assoc})` | `Equipe recevante: #10008 \| TV St. Johann (3L, ♀, SVRBA)` | Association code: `SVRBA` |
| `Heimteam: #{id} \| {team} ({cat}, {gender}, {assoc})` | `Heimteam: #20 \| Volley Amriswil (NLA, ♂, SV)` | Association code: `SV` |

### From GEO

Standard iCal format: `GEO:{latitude};{longitude}`

### From X-APPLE-STRUCTURED-LOCATION

Format: `X-APPLE-STRUCTURED-LOCATION;...;X-TITLE={hallName}:{lat};{lon}`

Extracts the hall name from `X-TITLE` parameter.

### From Google Maps URL

Plus Code extracted from: `https://maps.google.com/?q={plusCode}&hl={lang}`

Example: `8FV9HH8J%2B49` decodes to `8FV9HH8J+49`

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
- Gender is indicated by symbols: ♀ (women), ♂ (men)
- Country suffix in LOCATION varies: "Suisse" (French), "Schweiz" (German)
