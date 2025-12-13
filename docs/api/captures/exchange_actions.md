# Exchange Action Endpoints

## Popup Menu Actions

When clicking the "more_horiz" (⋯) button on an exchange row, a popup menu appears with:

1. **Détails du match** (Match details) - View match details
1. **Reprendre engagement** (Take over assignment) - Apply to take over the referee position

## Apply for Exchange (Reprendre engagement)

Based on the response structure and permissions, applying for an exchange updates the `appliedBy` field.

### Endpoint (Hypothesized)

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange
```

### Request Format

```
Content-Type: application/x-www-form-urlencoded

__identity=<exchange-uuid>
&appliedBy[indoorReferee][__identity]=<current-user-referee-uuid>
&__csrfToken=<csrf-token>
```

Or possibly a simpler format:

```
__identity=<exchange-uuid>
&apply=1
&__csrfToken=<csrf-token>
```

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

## TODO: Capture Actual Requests

Remaining items to confirm:

1. Network request when clicking "Reprendre engagement" (carefully - will actually apply!)

### Completed

- ✓ Delete from exchange: `deleteFromRefereeGameExchange` (batch array format)
- ✓ Add to exchange: `putRefereeConvocationIntoRefereeGameExchange` (single item format)

## Exchange Status Flow

```
open (no applicant)
    ↓ user clicks "Reprendre engagement"
applied (appliedBy set to user)
    ↓ admin assigns OR user clicks "Retirer candidature"
closed (assignment confirmed) OR back to open
```
