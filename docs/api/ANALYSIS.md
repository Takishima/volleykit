# API Response Analysis

## Key Findings from Assignments Response

### Structure Overview

The API uses a heavily nested object structure with UUIDs (`__identity`) for all entities. This is typical of a CQRS/Event Sourcing system or an ORM like Doctrine/Flow.

### Important Field Mappings

#### Referee Positions (Internal vs Display)

- Internal: `"head-one"`, `"head-two"`, `"linesman-one"`, etc.
- Display: "ARB 1", "ARB 2", "JL 1", etc. (shown in UI)

Our app needs to map:

```dart
enum RefereePosition {
  headOne,      // "head-one" -> "ARB 1"
  headTwo,      // "head-two" -> "ARB 2"
  linesmanOne,  // "linesman-one" -> "JL 1"
  linesmanTwo,  // "linesman-two" -> "JL 2"
  // ...
}
```

#### Date/Time Format

- Format: `"2025-12-08T19:30:00.000000+00:00"` (ISO 8601 with microseconds and timezone)
- Note: Response shows UTC (+00:00) but website displays local time (CET/CEST)

#### Gender

- Values: `"m"` or `"f"` (not "male"/"female")
- Display: Icons (♂/♀) in UI

#### Match Numbers

- Type: Integer (e.g., `382417`)
- Display: String with formatting

#### League Categories

- Complex nested structure: `game.group.phase.league.leagueCategory.name`
- Examples: "3L", "Mobilière Volley Cup"
- Multi-language: Has `translations` object with de/fr/it

### Nested Structure Depth

```
Assignment (root)
└── refereeGame
    ├── game
    │   ├── encounter
    │   │   ├── teamHome
    │   │   │   └── translations
    │   │   └── teamAway
    │   │       └── translations
    │   ├── hall
    │   │   ├── postalAddresses[]
    │   │   │   ├── country
    │   │   │   │   └── translations
    │   │   │   ├── countrySubdivision
    │   │   │   └── geographicalLocation (plusCode)
    │   │   └── primaryPostalAddress (same structure)
    │   ├── group
    │   │   ├── phase
    │   │   │   ├── league
    │   │   │   │   ├── leagueCategory
    │   │   │   │   │   └── translations
    │   │   │   │   └── gender
    │   │   │   └── translations
    │   │   └── translations
    │   └── postponements[]
    ├── refereeConvocations[]
    │   ├── indoorAssociationReferee
    │   │   └── indoorReferee
    │   │       └── person
    │   └── refereePosition
    └── activeRefereeConvocation[Position]
        └── (same as refereeConvocations item)
```

Maximum nesting depth: **8 levels**

### Fields We Actually Use

For our Flutter app, we only need a subset:

```json
{
  "__identity": "uuid",
  "refereePosition": "head-one|head-two",
  "confirmationStatus": "confirmed|pending|declined",
  "refereeGame": {
    "game": {
      "startingDateTime": "ISO8601",
      "number": integer,
      "encounter": {
        "teamHome": {"name": string},
        "teamAway": {"name": string}
      },
      "group": {
        "phase": {
          "league": {
            "leagueCategory": {"name": string},
            "gender": "m|f"
          }
        }
      },
      "hall": {
        "name": string,
        "primaryPostalAddress": {
          "city": string,
          "geographicalLocation": {
            "plusCode": string
          }
        }
      }
    },
    "activeRefereeConvocationFirstHeadReferee": {
      "indoorAssociationReferee": {
        "indoorReferee": {
          "person": {
            "firstName": string,
            "lastName": string,
            "displayName": string
          }
        }
      }
    },
    "activeRefereeConvocationSecondHeadReferee": {...},
    "activeRefereeConvocationFirstLinesman": {...},
    "activeRefereeConvocationSecondLinesman": {...}
  }
}
```

### Unused Fields (Can Omit from Mock)

- All `translations` objects (we only use one language)
- `Persistence_Object_Identifier`
- Detailed postal addresses (except city and plusCode)
- `refereeMatchingStatistic`
- `refereeSelectionBy` (who assigned the referee)
- `scheduledDoubleRefereeConvocations1/2`
- `nominationListOfTeamHome/Away` details
- `postponements` details
- `lastMessageToRefereeMoment`
- `_permissions` object
- Supervision flags (`isHeadOneSupervised`, etc.)

### Pagination

Response uses:

```json
{
  "items": [...],
  "totalItemsCount": 2
}
```

Note: No `currentPage` or `itemsPerPage` in response (might be implied from request)

### Boolean String Values

Some booleans are strings:

- `"isGameInFuture": "1"` (should be boolean `true`)
- `"hasNominationListToReviewByReferee": "1"`
- `"isOpenEntryInRefereeGameExchange": "0"`
- `"hasLastMessageToReferee": "0"`

Others are actual booleans:

- `"isSupervised": false`
- `"isPrimary": true`

### Null Handling

Many fields can be `null`:

- `nominationListOfTeamHome.closedAt`
- `activeRefereeConvocationFirstLinesman`
- `lastMessageToRefereeMoment`
- `linkedDoubleConvocationGameNumberAndRefereePosition`

Our app must handle these gracefully.

## Recommendations for Mock API

1. **Simplify Structure**: Create a flattened version with only necessary fields
1. **Normalize Booleans**: Use actual boolean values, not strings
1. **Single Language**: Remove translations, use German as default
1. **Essential Nesting Only**: Keep only the nesting levels we actually traverse
1. **Consistent Naming**: Match the app's Dart naming conventions

## Next Steps

1. ✅ Capture assignments response
1. ⏳ Capture compensations response
1. ⏳ Capture exchanges response
1. ✅ Capture request payloads (form data) - see `captures/*.txt`
1. ⏳ Document minimal vs full schema
1. ⏳ Build mock server with simplified schema
