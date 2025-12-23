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

### Apply for Exchange

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange
```

Form data:

```
__identity: <exchange_id>
apply: 1
__csrfToken: <token>
```

### Withdraw Application

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange
```

Form data:

```
__identity: <exchange_id>
withdrawApplication: 1
__csrfToken: <token>
```

## Notes

- Date filtering uses `propertyFilters` with `refereeGame.game.startingDateTime`
- Status filter uses `enumValues`: open, applied, closed
- Pagination uses `offset`/`limit` (not page-based)
- No default sorting (propertyOrderings is empty)
- Shows exchanges where referees can take over positions
- Filtered by required qualification level (referee can only see exchanges they're qualified for)
- Multiple referees can apply for the same exchange
