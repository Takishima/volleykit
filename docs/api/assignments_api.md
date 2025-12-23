# Assignments API (Referee Convocations)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/searchMyRefereeConvocations
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[propertyFilters][0][propertyName]: refereeGame.game.startingDateTime
searchConfiguration[propertyFilters][0][dateRange][from]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[propertyFilters][0][dateRange][to]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[customFilters]: (empty)
searchConfiguration[propertyOrderings][0][propertyName]: refereeGame.game.startingDateTime
searchConfiguration[propertyOrderings][0][descending]: false
searchConfiguration[propertyOrderings][0][isSetByUser]: true
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
      "refereeGame": {
        "game": {
          "startingDateTime": "2025-12-08T20:30:00+01:00",
          "number": "382417",
          "hall": {
            "name": "[Hall Name]",
            "plusCode": "[Plus Code]"
          },
          "teamHome": {
            "name": "[Home Team]"
          },
          "teamAway": {
            "name": "[Away Team]"
          },
          "league": {
            "name": "3L"
          },
          "gender": "m"
        },
        "referees": [
          {
            "position": "ARB 1",
            "person": {
              "firstName": "[First Name]",
              "lastName": "[Last Name]"
            }
          },
          {
            "position": "ARB 2",
            "person": {
              "firstName": "[First Name]",
              "lastName": "[Last Name]"
            }
          }
        ]
      }
    }
  ],
  "pagination": {
    "totalItems": 2,
    "currentPage": 1,
    "itemsPerPage": 50
  }
}
```

## Test Data

### Example 1: Assignment

- Date: 2025-12-08, 20:30
- Match #: 382417
- League: 3L
- Gender: Male
- Location: [City] ([Plus Code])
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]

### Example 2: Assignment

- Date: 2025-12-10, 20:00
- Match #: 392902
- League: Mobilière Volley Cup
- Gender: Male
- Location: [City] ([Plus Code])
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]

## Notes

- Date filtering uses `propertyFilters` with `refereeGame.game.startingDateTime`
- Pagination uses `offset`/`limit` (not page-based)
- Results are sorted by date/time by default (ascending)
- Only returns assignments for the authenticated referee
