# Compensations API (Travel Expenses)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocationcompensation/search
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[propertyOrderings][0][propertyName]: refereeGame.game.startingDateTime
searchConfiguration[propertyOrderings][0][descending]: false
searchConfiguration[propertyOrderings][0][isSetByUser]: true
searchConfiguration[dateRange][from]: YYYY-MM-DD
searchConfiguration[dateRange][to]: YYYY-MM-DD
searchConfiguration[dateProperty]: compensationDate
pagination[page]: 1
pagination[itemsPerPage]: 50
__csrfToken: <token_value>
```

## Response Format

JSON response with structure (see `docs/api/volleymanager-openapi.yaml` for full schema):

```json
{
  "items": [
    {
      "__identity": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "refereeConvocationStatus": "active",
      "compensationDate": "2025-12-08T20:30:00+01:00",
      "refereePosition": "ARB 2",
      "refereeGame": {
        "game": {
          "startingDateTime": "2025-12-08T20:30:00+01:00",
          "playingWeekday": "Sunday",
          "number": "382417",
          "displayName": "Volley Uster H2 vs VBC Münsingen H2",
          "group": {
            "name": "G1",
            "phase": {
              "name": "Regular Season",
              "league": {
                "gender": "m",
                "leagueCategory": {
                  "name": "3L"
                }
              }
            }
          },
          "encounter": {
            "teamHome": { "name": "Volley Uster H2" },
            "teamAway": { "name": "VBC Münsingen H2" }
          },
          "hall": {
            "name": "Sporthalle Example",
            "primaryPostalAddress": {
              "additionToAddress": null,
              "combinedAddress": "Sportstrasse 1, 8000 Zürich",
              "postalCode": "8000",
              "city": "Zürich",
              "country": { "countryCode": "CH" }
            }
          },
          "isVolleyCupGameWithoutNationalAssociationLeagueCategoryTeams": false
        },
        "isGameInFuture": false
      },
      "convocationCompensation": {
        "__identity": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "hasFlexibleGameCompensations": false,
        "gameCompensationFormatted": "50.00",
        "hasFlexibleTravelExpenses": false,
        "travelExpensesFormatted": "20.00",
        "hasFlexibleOvernightStayExpenses": false,
        "overnightStayExpensesFormatted": "0.00",
        "hasFlexibleCateringExpenses": false,
        "cateringExpensesFormatted": "0.00",
        "costFormatted": "70.00",
        "distanceInMetres": 96317,
        "distanceFormatted": "96.3 km",
        "transportationMode": "car",
        "paymentDone": true,
        "paymentValueDate": "2025-12-15",
        "paymentUpdatedByAssociation": { "name": "Volleyball Zürich" }
      },
      "indoorAssociationReferee": {
        "indoorReferee": {
          "person": {
            "associationId": "12345"
          }
        }
      }
    }
  ],
  "totalItemsCount": 2
}
```

## Test Data

### Example 1: Volley Uster Match

- Date: 2025-12-08, 20:30
- Match #: 382417
- League: 3L
- Gender: Male
- Home Team: Volley Uster H2
- Position: ARB 2
- Match Fee: CHF 50.00
- Travel: CHF 20.00
- Total: CHF 70.00
- Distance: 96.3 km
- Transport: Car

### Example 2: KSC Wiedikon Match

- Date: 2025-12-10, 20:00
- Match #: 392902
- League: Mobilière Volley Cup
- Gender: Male
- Home Team: KSC Wiedikon H1
- Position: ARB 1
- Match Fee: CHF 85.00
- Travel: CHF 70.00
- Total: CHF 155.00
- Distance: 78.2 km
- Transport: Car

## Notes

- The date property used for filtering is `compensationDate` (not the game date)
- Amounts are in Swiss Francs (CHF)
- Distance is in kilometers
- Payment status fields also exist but need to capture details

## PDF Download Endpoint

A PDF receipt (Quittung) can be downloaded for each compensation record:

```
GET /indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=<uuid>
```

**Note:** This endpoint does NOT use the `/api/` prefix.

Returns a PDF file with filename format: `YYYY-MM-DD_HH-MM_Quittung_fuer_Spiel_XXXXXX.pdf`

See [captures/compensation_pdf_download.md](captures/compensation_pdf_download.md) for full details.
