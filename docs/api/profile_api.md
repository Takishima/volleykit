# Profile API

This document describes the Profile API endpoints for retrieving and managing referee profile data in the VolleyManager system.

## Overview

The Profile API provides endpoints for:

- Retrieving person data with permissions
- Getting referee-specific profile data
- Managing payment connections
- Accessing seasonal referee data

All endpoints require authentication via the `Neos_Flow_Session` cookie.

## Endpoints

### Get Indoor Referee by Active Person

Retrieves comprehensive referee-specific data for a person, including certifications, contact information, and payment details.

**Endpoint:** `GET /api/indoorvolleyball.refadmin/api\indoorreferee/getIndoorRefereeByActivePerson`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `person` | UUID | Yes | The person identifier |

**Example Request:**

```http
GET /api/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson?person=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa HTTP/2
Host: volleymanager.volleyball.ch
Cookie: Neos_Flow_Session=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

**Response Headers:**

```http
HTTP/2 200
Content-Type: application/json
X-Flow-Powered: Flow/5.3
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `__identity` | UUID | Unique referee identifier |
| `refereeInformation` | string | Formatted: "Name (SV#, DOB, )" |
| `validated` | boolean | Whether profile is validated |
| `isInternationalReferee` | boolean | International referee status |
| `hasLinesmanCertification` | boolean | Linesman certification status |
| `transportationMode` | string | "car", "train", "public_transport" |
| `mobilePhoneNumbers` | string | Formatted phone number(s) |
| `fixnetPhoneNumbers` | string | Landline phone number(s) |
| `privatePostalAddresses` | string | Formatted private address |
| `businessPostalAddresses` | string | Formatted business address |
| `paymentConnections` | array | Bank accounts for compensation |
| `dateOfFirstRefereeCertification` | datetime | ISO 8601 timestamp |
| `dateOfFirstInternationalRefereeCertification` | datetime | ISO 8601 timestamp (nullable) |
| `numberOfPastActiveRefereeSeasonsUntil2022` | integer | Historical season count |
| `showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses` | boolean | TWINT visibility |
| `hasPlusCode` | boolean | Whether address has Plus Code geocoding |
| `_permissions` | object | CRUD permissions for all fields |

**Payment Connection Structure:**

```json
{
  "__identity": "00823de2-369f-470b-afbb-a843ffa2501d",
  "type": "bank",
  "iban": "CH25 0070 0114 9017 2754 5",
  "payee": "John Doe",
  "isPrimaryPaymentConnection": true,
  "financialInstitutionName": null,
  "payeePostalAddress": {
    "street": "Gartenstrasse",
    "houseNumber": "9",
    "postalCode": "8102",
    "city": "Oberengstringen",
    "country": { "countryCode": "CH", "countryName": "Suisse" },
    "geographicalLocation": {
      "latitude": 47.4104449,
      "longitude": 8.4609411,
      "plusCode": "8FVCCF66+59"
    }
  }
}
```

______________________________________________________________________

### Get Person with Permissions

Retrieves person data with their permissions for profile editing.

**Endpoint:** `GET /api/sportmanager.volleyball/api\person/showWithNestedObjects`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `person[__identity]` | UUID | The person identifier |
| `propertyRenderConfiguration[0]` | string | "_permissions" |

**Example Request:**

```http
GET /api/sportmanager.volleyball/api%5Cperson/showWithNestedObjects
  ?propertyRenderConfiguration[0]=_permissions
  &person[__identity]=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```

______________________________________________________________________

### Check Referee Data Management Permission

Checks if the active user is allowed to manage referee data.

**Endpoint:** `GET /api/indoorvolleyball.refadmin/api\refereeassociationsettings/isRefereeDataManagementAllowedForActiveParty`

**No parameters required.**

**Response:** `true` or `false`

______________________________________________________________________

### Get Indoor Association Referee of Active Party

Gets the association referee record for the current user.

**Endpoint:** `GET /api/indoorvolleyball.refadmin/api\indoorassociationreferee/getIndoorAssociationRefereeOfActiveParty`

**No parameters required.**

**Response:** Returns `IndoorAssociationReferee` object with status flags like `isDispensed`, `hasResigned`, `hasFutureRefereeConvocations`.

______________________________________________________________________

### Get Seasonal Referee Data

Retrieves seasonal referee data for the current season.

**Endpoint:** `POST /api/indoorvolleyball.refadmin/api\indoorassociationrefereeseasonalrefereedata/getForIndoorAssociationRefereeForCurrentSeason`

**Request Body:** Form-encoded with `__csrfToken`

______________________________________________________________________

### Get Referee Mandates by Managing Association

Retrieves referee mandates for a specific managing association.

**Endpoint:** `GET /api/indoorvolleyball.refadmin/api\refereemandate/getRefereeMandatesByManagingAssociation`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `managingAssociation` | UUID | The managing association identifier |

______________________________________________________________________

## Permissions Object

The `_permissions` object in responses indicates what operations are allowed on each field:

```json
{
  "object": {
    "create": true,
    "read": true,
    "update": true,
    "delete": true
  },
  "properties": {
    "transportationMode": {
      "create": true,
      "read": true,
      "update": true,
      "required": false
    },
    "paymentConnections": {
      "create": true,
      "read": true,
      "update": true,
      "required": false
    }
  }
}
```

Fields with `update: true` can be modified by the user.

## Error Handling

### 401 Unauthorized

Returned when:
- Session cookie is missing or expired
- User doesn't have permission to access the profile

```json
{
  "error": "Session expired. Please log in again."
}
```

## Implementation Notes

1. **URL Encoding**: The backslash in paths (`api\indoorreferee`) must be URL-encoded as `%5C`
2. **Person UUID**: The `person` parameter is the UUID from the person object, not the SV number
3. **Payment Connections**: Users can have multiple payment connections; `isPrimaryPaymentConnection` indicates the default
4. **TWINT Setting**: `showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses` controls phone visibility on expense statements

## Captured From

- **Date:** 2026-01-03
- **Browser:** Firefox
- **Endpoint:** `volleymanager.volleyball.ch`

See `docs/api/captures/profile_endpoints.md` for full response examples.
