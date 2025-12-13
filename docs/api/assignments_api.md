# Assignments API (Referee Convocations)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/searchMyRefereeConvocations
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[sorting][0][field]: TODO - capture from browser
searchConfiguration[sorting][0][direction]: TODO - capture from browser
searchConfiguration[dateRange][from]: YYYY-MM-DD
searchConfiguration[dateRange][to]: YYYY-MM-DD
searchConfiguration[dateProperty]: refereeConvocation.refereeGame.game.startingDateTime
pagination[page]: 1
pagination[itemsPerPage]: 50
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

- The date property used for filtering is `refereeConvocation.refereeGame.game.startingDateTime`
- Results are sorted by date/time by default (ascending)
- Only returns assignments for the authenticated referee
