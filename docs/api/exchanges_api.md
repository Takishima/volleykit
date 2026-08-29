# Game Exchanges API (Bourse aux arbitrages)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereegameexchange/search
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[propertyFilters][0][propertyName]: refereeGame.game.startingDateTime
searchConfiguration[propertyFilters][0][dateRange][from]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[propertyFilters][0][dateRange][to]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[propertyFilters][1][propertyName]: status
searchConfiguration[propertyFilters][1][enumValues][0]: open
searchConfiguration[customFilters]: (empty)
searchConfiguration[propertyOrderings]: (empty - no default sorting)
searchConfiguration[offset]: 0
searchConfiguration[limit]: 10
searchConfiguration[textSearchOperator]: AND
__csrfToken: <token_value>
```

## Response Format

JSON response with structure:

```json
{
  "items": [
    {
      "game": {
        "startingDateTime": "2025-12-13T13:00:00+01:00",
        "number": "382215",
        "league": "2L",
        "gender": "m",
        "teamHome": {
          "name": "[Team Name]"
        },
        "teamAway": {
          "name": "[Team Name]"
        }
      },
      "position": "ARB 1",
      "requiredLevel": "N3",
      "requiredQualification": "1",
      "status": "open",
      "submittedBy": {
        "firstName": "[First Name]",
        "lastName": "[Last Name]"
      },
      "appliedBy": {
        "firstName": "[First Name]",
        "lastName": "[Last Name]"
      }
    }
  ],
  "pagination": {
    "totalItems": 7,
    "currentPage": 1,
    "itemsPerPage": 50
  }
}
```

## Test Data

### Example 1: Exchange Entry

- Date: 2025-12-13, 13:00 (Saturday)
- Status: Open
- Position: ARB 1
- Required Level: N3
- Required Qualification: 1
- Match #: 382215
- League: 2L
- Gender: Male
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]
- Applied By: (none yet)

### Example 2: Exchange Entry

- Date: 2026-01-16, 20:15 (Friday)
- Status: Open
- Position: ARB 1
- Required Level: N4
- Required Qualification: 3
- Match #: 383053
- League: 5L
- Gender: Female
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: (empty)

### Example 3: Exchange Entry

- Date: 2026-01-17, 14:00 (Saturday)
- Status: Open
- Position: ARB 1
- Required Level: N3
- Required Qualification: 2
- Match #: 382316
- League: 3L
- Gender: Male
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]

(+ 4 more examples observed with 7 total items)

## Actions

### Take Over Exchange (Confirmed)

See [exchange_actions.md](captures/exchange_actions.md) for confirmed API documentation.

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange/pickFromRefereeGameExchange
```

Form data:

```
refereeGameExchange[__identity]: <exchange_uuid>
__csrfToken: <token>
```

### Remove Own Exchange (Confirmed)

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/deleteFromRefereeGameExchange
```

Form data:

```
refereeConvocations[0][__identity]: <convocation_uuid>
__csrfToken: <token>
```

## Take-over Permission (`_permissions`)

Each item in the response carries the server's verdict on whether the signed-in
referee may take that entry over:

```json
{
  "_permissions": {
    "properties": {
      "appliedBy": { "update": false }
    }
  }
}
```

- `true`: the referee can apply (`pickFromRefereeGameExchange` succeeds)
- `false`: a conflict of interest blocks them - they are registered as a referee
  for one of the two teams playing that game.

The flag is not about referee level: a capture from a referee cleared up to and
including National League B had `update: false` on regional games they are
qualified for. Take the field as the server's answer and do not re-derive it
from `requiredRefereeLevel`.

The search endpoint returns every open entry regardless of this flag, so the
clients filter on it: entries with `update: false` are dropped from the Open tab.
Own entries are kept - they carry `update: false` too, yet must stay visible so
the submitter can pull them back off the marketplace. An entry without the flag
is treated as takeable so a missing property never empties the list.

Request `_permissions` in `propertyRenderConfiguration` to get it.

## Notes

- Date filtering uses `propertyFilters` with `refereeGame.game.startingDateTime`
- Status filter uses `enumValues`: open, applied, closed
- Pagination uses `offset`/`limit` (not page-based)
- No default sorting (propertyOrderings is empty)
- Shows exchanges where referees can take over positions
- Filtered by required qualification level (referee can only see exchanges they're qualified for)
- When a referee takes over an exchange, it becomes theirs immediately
