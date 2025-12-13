# Compensations API (Travel Expenses)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocationcompensation/search
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[sorting][0][field]: TODO - capture from browser
searchConfiguration[sorting][0][direction]: TODO - capture from browser
searchConfiguration[dateRange][from]: YYYY-MM-DD
searchConfiguration[dateRange][to]: YYYY-MM-DD
searchConfiguration[dateProperty]: compensationDate
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
      // TODO: Capture actual response structure from browser
      "compensationDate": "2025-12-08T20:30:00+01:00",
      "matchNumber": "382417",
      "league": "3L",
      "gender": "m",
      "homeTeam": "Volley Uster H2",
      "refereePosition": "ARB 2",
      "matchCompensation": 50.00,
      "travelExpense": 20.00,
      "accommodation": null,
      "meal": null,
      "totalCompensation": 70.00,
      "calculatedDistance": 96.3,
      "transportMethod": "car"
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
