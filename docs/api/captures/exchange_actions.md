# Exchange Action Endpoints

## Popup Menu Actions

When clicking the "more_horiz" (⋯) button on an exchange row, a popup menu appears with:

1. **Détails du match** (Match details) - View match details
1. **Reprendre engagement** (Take over assignment) - Apply to take over the referee position

## Apply for Exchange / Take Over Assignment (Reprendre engagement) - Confirmed

Taking over a referee position from the exchange marketplace.

### Endpoint

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange/pickFromRefereeGameExchange
```

### Request Format (Confirmed)

```
Content-Type: application/x-www-form-urlencoded

refereeGameExchange[__identity]=<exchange-uuid>
&__csrfToken=<csrf-token>
```

**Example:**

```
refereeGameExchange%5B__identity%5D=eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
&__csrfToken=<csrf-token>
```

### Response (200 OK)

```json
{
  "refereeGameExchange": {
    "__identity": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "persistenceObjectIdentifier": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "status": "applied",
    "refereePosition": "head-two",
    "submittingType": "referee",
    "submittedAt": "2025-01-22T12:58:18.000000+00:00",
    "appliedAt": "2025-01-23T20:38:41.954034+00:00",
    "requiredRefereeLevel": "N3",
    "requiredRefereeLevelGradationValue": 4,
    "createdAt": "2025-01-22T12:58:18.000000+00:00",
    "createdBy": "user_name",
    "updatedAt": "2025-01-23T13:00:16.000000+00:00",
    "updatedBy": "System",
    "_permissions": { ... }
  }
}
```

**Notes:**

- The endpoint name `pickFromRefereeGameExchange` suggests "picking" the assignment from the exchange
- Status changes to `applied` after the action
- `appliedAt` is set to the current timestamp

### Permissions Check

The response includes permissions that indicate if the user can apply:

```json
"_permissions": {
  "properties": {
    "appliedBy": {
      "update": true
    }
  }
}
```

- `appliedBy.update: true` means the user CAN apply for this exchange
- `appliedBy.update: false` means the user cannot apply (e.g., already applied, doesn't meet level requirements)

## Delete from Exchange (Confirmed)

Remove an assignment from the exchange marketplace (withdraw from bourse).

### Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/deleteFromRefereeGameExchange
```

### Request Format (Confirmed)

```
Content-Type: application/x-www-form-urlencoded

refereeConvocations[0][__identity]=<convocation-uuid>
&__csrfToken=<csrf-token>
```

**Example:**

```
refereeConvocations%5B0%5D%5B__identity%5D=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
&__csrfToken=<csrf-token>
```

**URL-decoded:**

```
refereeConvocations[0][__identity]=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
&__csrfToken=<csrf-token>
```

**Notes:**

- The `refereeConvocations` array format supports batch operations
- Multiple convocations can be removed at once using `refereeConvocations[1][__identity]`, etc.
- The convocation UUID is the referee's assignment UUID
- This endpoint is on `refereeconvocation`, not `refereegameexchange`

## Match Details Dialog

The "Détails du match" action likely opens a modal/dialog showing:

- Full match information
- Hall address and directions
- All referee positions and assigned referees
- Match history/status

This may be a client-side modal using already-fetched data, or it may fetch additional details via:

```
GET /api/indoorvolleyball.refadmin/api\refereegame/<game-uuid>
```

## Add to Exchange (Confirmed)

Add an assignment to the exchange marketplace (bourse aux arbitrages).

### Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/putRefereeConvocationIntoRefereeGameExchange
```

### Request Format (Confirmed)

```
Content-Type: application/x-www-form-urlencoded

refereeConvocation=<convocation-uuid>
&__csrfToken=<csrf-token>
```

**Example:**

```
refereeConvocation=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
&__csrfToken=<csrf-token>
```

**Notes:**

- Uses singular `refereeConvocation` (not array format like delete)
- Only supports adding one convocation at a time
- A confirmation dialog is shown before the action is executed

______________________________________________________________________

## Completed Captures

- ✓ Delete from exchange: `deleteFromRefereeGameExchange` (batch array format)
- ✓ Add to exchange: `putRefereeConvocationIntoRefereeGameExchange` (single item format)
- ✓ Take over assignment: `pickFromRefereeGameExchange` (confirmed Jan 2026)

## Exchange Status Flow

```
open (no applicant)
    ↓ user clicks "Reprendre engagement"
applied (appliedBy set to user)
    ↓ admin assigns OR user clicks "Retirer candidature"
closed (assignment confirmed) OR back to open
```
