# Compensation Edit Dialog Endpoints

When clicking "Editer les frais et l'indemnité" (Edit fees and compensation) from the Assignments tab, several API calls are made to load the compensation editing form.

## Dialog Overview

The dialog allows referees to:

- Configure travel expense calculation (checkbox "Frais de voyage")
- Set claimable percentage ("Exigible" dropdown: 100%, etc.)
- Add variable additional compensations

## API Calls (4 parallel requests)

### 1. Find Convocation Compensation Settings

Gets the compensation settings specific to this convocation.

```
GET /api/indoorvolleyball.refadmin/api\refereeconvocation/findConvocationCompensationSettingsForRefereeConvocation
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| refereeConvocation | UUID | The convocation identifier |

**Example:**

```
GET ...findConvocationCompensationSettingsForRefereeConvocation?refereeConvocation=<convocation-uuid>
```

______________________________________________________________________

### 2. Get Association Compensation Settings

Gets the association-level compensation settings that apply to this convocation.

```
GET /api/indoorvolleyball.refadmin/api\associationcompensationsettings/getAssociationCompensationSettingsByRefereeConvocation
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| refereeConvocation | UUID | The convocation identifier |

**Example:**

```
GET ...getAssociationCompensationSettingsByRefereeConvocation?refereeConvocation=<convocation-uuid>
```

______________________________________________________________________

### 3. Show Convocation Compensation with Nested Objects

Gets the current compensation record with its additional compensations.

```
GET /api/indoorvolleyball.refadmin/api\convocationcompensation/showWithNestedObjects
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| convocationCompensation[\_\_identity] | UUID | The compensation record identifier |
| propertyRenderConfiguration[] | Array | Properties to include |

**Property Render Configuration:**

- `additionalCompensations` - Fixed additional compensation entries
- `flexibleAdditionalCompensations` - Variable additional compensation entries
- `lockPayoutCentralPayoutCompensationBy` - Lock status for central payout

**Example:**

```
GET ...convocationcompensation/showWithNestedObjects
  ?convocationCompensation[__identity]=<compensation-uuid>
  &propertyRenderConfiguration[0]=additionalCompensations
  &propertyRenderConfiguration[1]=flexibleAdditionalCompensations
  &propertyRenderConfiguration[2]=lockPayoutCentralPayoutCompensationBy
```

______________________________________________________________________

### 4. Search Flexible Additional Compensations

Searches for available flexible additional compensation types.

```
POST /api/indoorvolleyball.refadmin/api\flexibleadditionalcompensation/search
```

**Request Format:**

```
Content-Type: application/x-www-form-urlencoded

searchConfiguration[offset]=0
&searchConfiguration[limit]=100
&__csrfToken=<token>
```

______________________________________________________________________

## Dialog Fields

### Indemnité réglementaire (Regulatory Compensation)

| Field | Type | Description |
|-------|------|-------------|
| Frais de voyage | Checkbox | Whether travel expenses are included |
| Exigible | Dropdown | Claimable percentage (e.g., 100%) |

### Indemnités complémentaires variables (Variable Additional Compensations)

A table where referees can add additional compensation items:

- "Ajouter" button to add new entries
- Empty by default ("Aucune donnée disponible")

______________________________________________________________________

## Save Action (Confirmed)

When clicking "Enregistrer" (Save), the form submits:

```
PUT /api/indoorvolleyball.refadmin/api\convocationcompensation
```

**Request Format:**

IMPORTANT: The `__identity` must be nested inside `convocationCompensation`, not at root level!

```
Content-Type: text/plain;charset=UTF-8

convocationCompensation[__identity]=<compensation-uuid>
&convocationCompensation[distanceInMetres]=56000
&convocationCompensation[correctionReason]=<reason-text>
&convocationCompensation[payTravelExpenses]=1
&convocationCompensation[travelExpensesPercentageWeighting]=1
&__csrfToken=<token>
```

**Response:** 200 OK on success with updated compensation record as JSON

After saving, the assignments list is automatically refreshed via `searchMyRefereeConvocations`.

______________________________________________________________________

## Related Data

The compensation record is linked to the convocation via the `refereeConvocation` field.

From the compensations search response, a typical record includes:

- `distanceInMetres`: 96317 (96.3 km)
- `transportationMode`: "car"
- `travelExpenses`: 20 CHF
- `gameCompensation`: 50 CHF
- `travelExpensesPercentageWeighting`: 1 (100%)

______________________________________________________________________

## Notes

- The dialog loads data from multiple endpoints in parallel
- Association settings determine what compensation options are available
- Flexible additional compensations allow referees to claim extra expenses
- The `lockPayoutCentralPayoutCompensationBy` field controls whether central payout is locked
