# Referee Backup (Pikett) Endpoints

## Overview

The referee backup (Pikett) system manages on-call referees for NLA (National League A) and NLB (National League B) games. Backup referees are available to step in if a scheduled referee cannot attend a game.

## Search Referee Backups

### Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocationrefereebackup/search
```

> **Note:** The backslash in the path is intentional - VolleyManager's API (built on Neos Flow framework) uses this unusual URL pattern with backslashes as namespace separators.

### Request

**Content-Type:** `application/x-www-form-urlencoded`

**URL-encoded body:**

```
searchConfiguration[propertyFilters][0][propertyName]=date
&searchConfiguration[propertyFilters][0][dateRange][from]=2025-01-08T23:00:00.000Z
&searchConfiguration[propertyFilters][0][dateRange][to]=2025-01-23T22:59:59.000Z
&searchConfiguration[customFilters][0][name]=myReferees
&searchConfiguration[propertyOrderings][0][propertyName]=date
&searchConfiguration[propertyOrderings][0][descending]=false
&searchConfiguration[propertyOrderings][0][isSetByUser]=true
&searchConfiguration[offset]=0
&searchConfiguration[limit]=10
&searchConfiguration[textSearchOperator]=AND
&propertyRenderConfiguration[0]=date
&propertyRenderConfiguration[1]=weekday
&propertyRenderConfiguration[2]=calendarWeek
&propertyRenderConfiguration[3]=joinedNlaReferees
&propertyRenderConfiguration[4]=joinedNlbReferees
&propertyRenderConfiguration[5]=nlaReferees.*.indoorReferee.person.primaryEmailAddress
&propertyRenderConfiguration[6]=nlbReferees.*.indoorReferee.person.primaryEmailAddress
&propertyRenderConfiguration[7]=nlaReferees.*.indoorReferee.person.primaryPhoneNumber
&propertyRenderConfiguration[8]=nlbReferees.*.indoorReferee.person.primaryPhoneNumber
&__csrfToken=<csrf-token>
```

### Response (Anonymized)

```json
{
  "items": [
    {
      "calendarWeek": 2,
      "date": "2025-01-10T23:00:00.000000+00:00",
      "joinedNlaReferees": "#12345 | Max Mustermann (max@example.com, +41791234567)",
      "joinedNlbReferees": "#67890 | Anna Schmidt (anna@example.com, +41797654321)\n#11111 | Peter Mueller (peter@example.com, +41791111111)",
      "nlaReferees": [
        {
          "createdBy": "System",
          "createdByIpAddress": null,
          "createdByPersistenceIdentifier": "System",
          "deletedAt": null,
          "hasFutureRefereeConvocations": true,
          "hasResigned": false,
          "indoorReferee": {
            "persistenceObjectIdentifier": "11111111-aaaa-bbbb-cccc-222222222222",
            "person": {
              "associationId": 12345,
              "displayName": "Max Mustermann",
              "firstName": "Max",
              "lastName": "Mustermann",
              "gender": "m",
              "correspondenceLanguage": "de",
              "primaryEmailAddress": {
                "emailAddress": "max@example.com",
                "isPrimary": true,
                "__identity": "33333333-dddd-eeee-ffff-444444444444"
              },
              "primaryPhoneNumber": {
                "localNumber": "079 123 45 67",
                "normalizedLocalNumber": "+41791234567",
                "numberType": "mobile",
                "isPrimary": true,
                "__identity": "55555555-aaaa-bbbb-cccc-666666666666"
              },
              "__identity": "77777777-aaaa-bbbb-cccc-888888888888"
            },
            "refereeInformation": "Mustermann Max (12345, 1990-01-15, )",
            "transportationMode": "car",
            "validated": true,
            "mobilePhoneNumbers": "+41791234567",
            "privatePostalAddresses": "Musterstrasse 1, 8000 Zuerich",
            "__identity": "11111111-aaaa-bbbb-cccc-222222222222"
          },
          "isDispensed": false,
          "lastUpdatedByRealUser": false,
          "originId": 1234,
          "persistenceObjectIdentifier": "99999999-aaaa-bbbb-cccc-000000000000",
          "unconfirmedFutureRefereeConvocations": false,
          "updatedBy": "System",
          "updatedByIpAddress": null,
          "updatedByPersistenceIdentifier": "System",
          "__identity": "99999999-aaaa-bbbb-cccc-000000000000"
        }
      ],
      "nlbReferees": [
        {
          "createdBy": "System",
          "hasFutureRefereeConvocations": true,
          "hasResigned": false,
          "indoorReferee": {
            "persistenceObjectIdentifier": "aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb",
            "person": {
              "associationId": 67890,
              "displayName": "Anna Schmidt",
              "firstName": "Anna",
              "lastName": "Schmidt",
              "primaryEmailAddress": {
                "emailAddress": "anna@example.com",
                "__identity": "cccccccc-4444-5555-6666-dddddddddddd"
              },
              "primaryPhoneNumber": {
                "normalizedLocalNumber": "+41797654321",
                "__identity": "eeeeeeee-7777-8888-9999-ffffffffffff"
              },
              "__identity": "11112222-3333-4444-5555-666677778888"
            },
            "__identity": "aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb"
          },
          "isDispensed": false,
          "__identity": "aaaabbbb-cccc-dddd-eeee-ffffffffffff"
        }
      ],
      "weekday": "So",
      "__identity": "12345678-abcd-ef01-2345-6789abcdef01"
    }
  ],
  "totalItemsCount": 1,
  "entityTemplate": null
}
```

## Key Fields

### RefereeBackupEntry

| Field | Description |
|-------|-------------|
| `__identity` | Unique ID for the backup entry (date-based) |
| `date` | ISO 8601 date for the backup assignment |
| `weekday` | Short weekday name (e.g., "So" for Sunday) |
| `calendarWeek` | Calendar week number (1-53) |
| `joinedNlaReferees` | Formatted string with NLA referee contact info |
| `joinedNlbReferees` | Formatted string with NLB referee contact info |
| `nlaReferees` | Array of detailed NLA referee assignments |
| `nlbReferees` | Array of detailed NLB referee assignments |

### Custom Filters

| Filter | Description |
|--------|-------------|
| `myReferees` | Only show referees managed by the current association |

## Notes

- The endpoint is used by referee administrators to manage on-call schedules
- The `joinedXxxReferees` fields provide pre-formatted display strings
- Each referee includes full person and contact details
- Date filtering typically spans 2 weeks ahead
- The response includes permission metadata (`_permissions`) for each object
