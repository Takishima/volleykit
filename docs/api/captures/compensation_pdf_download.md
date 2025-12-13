# Compensation PDF Download Endpoint

Captures the endpoint for downloading referee statement of expenses (Quittung) PDF documents.

## Endpoint

```
GET /indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses
```

**Note:** This endpoint does NOT use the `/api/` prefix unlike most other API endpoints.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
| ------------------ | ---- | -------- | -------------------------------- |
| refereeConvocation | UUID | Yes | The referee convocation identifier |

### Example Request

```
GET /indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=<convocation-uuid>
```

### Request Headers

| Header | Value |
| ------- | ------------------------------------------------------------ |
| Accept | text/html,application/xhtml+xml,application/xml;q=0.9,\*/\*;q=0.8 |
| Referer | https://volleymanager.volleyball.ch/indoorvolleyball.refadmin/refereeconvocationcompensation/index |
| Cookie | Neos_Flow_Session=\<session-id> |

## Response

### Success (200)

Returns a PDF document as binary data.

#### Response Headers

| Header | Value |
| ------------------------- | -------------------------------------------------------------- |
| content-type | application/pdf; charset=utf-8 |
| content-disposition | attachment; filename="YYYY-MM-DD_HH-MM_Quittung_fuer_Spiel_XXXXXX.pdf" |
| content-description | File Transfer |
| content-transfer-encoding | binary |
| expires | 0 |

#### Filename Format

The filename follows this pattern:

```
YYYY-MM-DD_HH-MM_Quittung_fuer_Spiel_XXXXXX.pdf
```

Where:

- `YYYY-MM-DD` - Date of PDF generation
- `HH-MM` - Time of PDF generation (24h format)
- `XXXXXX` - Match/game number

Example: `2025-01-15_14-30_Quittung_fuer_Spiel_384889.pdf`

### Error Responses

| Status | Description |
| ------ | --------------------------------------------------------------------- |
| 401 | Unauthorized - User not authenticated |
| 404 | Convocation not found or user not authorized to access this resource |

## PDF Content

The PDF document (Quittung = Receipt) contains:

- Match details (date, time, location)
- Teams (home and away)
- League/competition name
- Referee position held
- Game compensation amount (CHF)
- Travel expenses (CHF)
- Additional compensations if applicable
- Total compensation (CHF)
- Distance traveled (km)
- Transportation method

## Usage Context

This endpoint is accessed from the compensation index page when a user wants to download a receipt for a specific assignment. The link is typically presented in the compensation list view for each completed and compensated assignment.

## Captured From

- HAR files: `get_compensation_pdf.har`, `compensation_2.har`
- Captured: 2025-12-11
- Source page: Compensation index (`/indoorvolleyball.refadmin/refereeconvocationcompensation/index`)
