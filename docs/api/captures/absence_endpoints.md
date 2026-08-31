# Referee Absence Endpoints

Captured 2026-08-31 from the absence administration page
(`/indoorvolleyball.refadmin/refereeabsence/administrate`).

> **Note:** The backslash in the paths is intentional - VolleyManager's API (built on
> Neos Flow framework) uses backslashes as namespace separators. In URLs the backslash
> is percent-encoded as `%5c`.

## Get Forbidden Blockage Date Ranges

Returns the valid date window for creating absences plus any date ranges in which the
association forbids absence creation (e.g. finals weekends). The data is scoped to the
**active association** (party context) of the session.

### Endpoint

```
GET /api/indoorvolleyball.refadmin/api\refereeabsence/getForbiddenBlockageDateRanges
```

No query parameters.

### Response (association A)

```json
{
  "minimumDate": "2026-09-18T22:00:00.000000+00:00",
  "maximumDate": "2027-05-02T21:59:59.000000+00:00",
  "forbiddenDateRanges": []
}
```

### Response (association B, same referee after switching party context)

```json
{
  "minimumDate": "2026-08-31T22:00:00.000000+00:00",
  "maximumDate": "2027-04-30T21:59:59.000000+00:00",
  "forbiddenDateRanges": []
}
```

Observations:

- **This endpoint is create-form validation config**, not the "blocked dates" data
  itself: it feeds the calendar widget on the absence creation form (selectable window +
  forbidden picks). The actual per-association blocked dates are the absence entries
  returned by `refereeabsence/search` below.
- The two captured windows differed (fixed future season start 2026-09-19 local vs
  midnight of the next local day, and differing maximums), but one capture taken right
  after a party-context switch returned a payload identical to the previous context - so
  whether the window is truly association-scoped or partially a rolling/site-wide
  setting is not settled.
- `forbiddenDateRanges` was empty in all captures; per the schema it holds
  `{ "from": ..., "to": ... }` objects when set.
- `Content-Type: application/json`.

## Search Referee Absences

Returns the current referee's own absence entries for the active association.

### Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereeabsence/search
```

**Content-Type:** `application/x-www-form-urlencoded` (searchConfiguration + `__csrfToken`,
same pattern as the other search endpoints).

### Response (Anonymized)

```json
{
  "items": [
    {
      "__identity": "aaaaaaaa-0000-0000-0000-000000000001",
      "fromDate": "2027-02-27T05:00:00.000000+00:00",
      "toDate": "2027-03-07T22:59:59.000000+00:00",
      "detailedReason": "Ski holidays",
      "createdAt": "2026-07-05T08:48:07.000000+00:00",
      "createdBy": "max_mustermann",
      "updatedAt": "2026-07-05T08:48:07.000000+00:00",
      "updatedBy": "max_mustermann",
      "_permissions": {
        "object": { "delete": true, "update": true, "create": true },
        "properties": { "detailedReason": { "read": true } }
      }
    },
    {
      "__identity": "aaaaaaaa-0000-0000-0000-000000000002",
      "fromDate": "2026-10-24T04:00:00.000000+00:00",
      "toDate": "2026-10-24T21:59:59.000000+00:00",
      "detailedReason": "Linesman duty",
      "createdAt": "2026-07-13T19:07:38.000000+00:00",
      "createdBy": "max_mustermann",
      "updatedAt": "2026-07-13T19:07:38.000000+00:00",
      "updatedBy": "max_mustermann",
      "_permissions": {
        "object": { "delete": true, "update": true, "create": true },
        "properties": { "detailedReason": { "read": true } }
      }
    },
    {
      "__identity": "aaaaaaaa-0000-0000-0000-000000000003",
      "fromDate": "2026-09-19T04:00:00.000000+00:00",
      "toDate": "2026-09-19T21:59:59.000000+00:00",
      "detailedReason": "",
      "createdAt": "2026-08-04T12:39:02.000000+00:00",
      "createdBy": "max_mustermann",
      "updatedAt": "2026-08-04T12:39:02.000000+00:00",
      "updatedBy": "max_mustermann",
      "_permissions": {
        "object": { "delete": true, "update": true, "create": true },
        "properties": { "detailedReason": { "read": true } }
      }
    }
  ],
  "totalItemsCount": 10
}
```

### Response excerpt (association B, same referee after switching party context)

Association B returned a completely different list (`totalItemsCount: 61` vs 10),
including batch-created read-only entries:

```json
{
  "items": [
    {
      "__identity": "bbbbbbbb-0000-0000-0000-000000000001",
      "fromDate": "2027-03-14T05:00:00.000000+00:00",
      "toDate": "2027-03-14T22:59:00.000000+00:00",
      "detailedReason": "National squad referee duty",
      "createdAt": "2026-07-05T15:24:49.000000+00:00",
      "createdBy": "max_mustermann",
      "updatedAt": "2026-07-05T15:24:49.000000+00:00",
      "updatedBy": "max_mustermann",
      "_permissions": {
        "object": { "delete": false, "update": false, "create": false },
        "properties": { "detailedReason": { "read": true } }
      }
    }
  ],
  "totalItemsCount": 61
}
```

Observations:

- **Absences are stored per association**: the same referee got disjoint lists from two
  associations. There is no cross-association endpoint; seeing every association's
  blocked dates requires one party-context switch per association.
- **Read-only entries exist**: batch-generated absences (e.g. national-squad referee
  duty dates, all sharing one `createdAt` second) come back with
  `_permissions.object.delete/update/create` all `false`. UI must gate edit affordances
  on `_permissions`, not assume ownership.
- `detailedReason` may be an empty string.
- Single-day absences use `fromDate` ~05:00 UTC to `toDate` ~22:59 UTC of the same day
  (04:00/21:59 during DST) - i.e. full local days. Batch-generated entries end at
  22:59:00 rather than 22:59:59.
- No `absenceReason` reference appeared in the response (it may require an explicit
  `propertyRenderConfiguration` entry - not yet captured).
- Response `Content-Type` is `text/html; charset=UTF-8` despite the JSON body (quirk
  shared with other VolleyManager search endpoints).

## List Absence Reasons

Returns the association-defined catalog of absence reasons, with translations. Reasons are
created by association administrators; visibility is role-based (`rolesAllowedToRead`).

### Endpoint

```
GET /api/indoorvolleyball.refadmin/api\refereeabsencereason/listWithNestedObjects?propertyRenderConfiguration[0]=rolesAllowedToRead.*
```

### Response (Anonymized, trimmed to 2 of 11 items)

```json
{
  "items": [
    {
      "__identity": "cccccccc-0000-0000-0000-000000000001",
      "active": true,
      "description": " Pas de réponse",
      "translations": {
        "de": { "description": " Keine Angabe" },
        "fr": { "description": " Pas de réponse" },
        "it": { "description": " Nessuna risposta" }
      },
      "rolesAllowedToRead": [
        "SportManager.Indoorvolleyball:RegionalAssociationAdministrator",
        "Indoorvolleyball.RefAdmin:RegionalAssociationRefereeResponsible",
        "Indoorvolleyball.RefAdmin:Referee"
      ],
      "createdAt": "2022-05-24T07:54:25.000000+00:00",
      "createdBy": "erika_musterfrau",
      "createdByIpAddress": null,
      "createdByPersistenceIdentifier": "dddddddd-0000-0000-0000-000000000001",
      "lastUpdatedByRealUser": null,
      "updatedAt": "2022-05-24T07:59:35.000000+00:00",
      "updatedBy": "erika_musterfrau",
      "updatedByImpersonationSession": null,
      "updatedByIpAddress": "<ip-address>",
      "updatedByPersistenceIdentifier": "dddddddd-0000-0000-0000-000000000001",
      "_permissions": {
        "object": { "create": true, "read": true, "update": true, "delete": false },
        "properties": {
          "description": { "create": true, "read": true, "update": true, "required": false },
          "rolesAllowedToRead": { "create": true, "read": true, "update": true, "required": false },
          "active": { "create": true, "read": true, "update": true, "required": false },
          "translations": { "create": true, "read": true, "update": true, "required": false }
        }
      }
    },
    {
      "__identity": "cccccccc-0000-0000-0000-000000000002",
      "active": true,
      "description": "Vacances",
      "translations": {
        "de": { "description": "Ferien" },
        "fr": { "description": "Vacances" },
        "it": { "description": "Vacanze" }
      },
      "rolesAllowedToRead": [
        "SportManager.Indoorvolleyball:RegionalAssociationAdministrator",
        "Indoorvolleyball.RefAdmin:RegionalAssociationRefereeResponsible",
        "Indoorvolleyball.RefAdmin:Referee"
      ],
      "createdAt": "2022-05-24T07:55:38.000000+00:00",
      "createdBy": "erika_musterfrau",
      "createdByIpAddress": null,
      "createdByPersistenceIdentifier": "dddddddd-0000-0000-0000-000000000001",
      "lastUpdatedByRealUser": null,
      "updatedAt": "2022-05-24T07:55:38.000000+00:00",
      "updatedBy": "erika_musterfrau",
      "updatedByImpersonationSession": null,
      "updatedByIpAddress": "<ip-address>",
      "updatedByPersistenceIdentifier": "dddddddd-0000-0000-0000-000000000001",
      "_permissions": {
        "object": { "create": true, "read": true, "update": true, "delete": false }
      }
    }
  ]
}
```

Full reason catalog captured for the association (default description is French here,
`translations` carries de/fr/it):

| de                          | fr                                       | it                                |
| --------------------------- | ---------------------------------------- | --------------------------------- |
| Keine Angabe                | Pas de réponse                           | Nessuna risposta                  |
| Berufliche Gründe           | Raisons professionnelles                 | Motivi professionali              |
| Einsatz als Linienrichter   | Engagement en tant que juge de ligne     | Impegno come guardalinee          |
| Einsatz als Spieler/Trainer | Engagement en tant que joueur/entraîneur | Impegno come giocatore/allenatore |
| Ferien                      | Vacances                                 | Vacanze                           |
| Krank                       | Malade                                   | Malato                            |
| Militär                     | Militaire                                | Militare                          |
| Persönliche Gründe          | Raisons personnelles                     | Motivi personali                  |
| Ruhetag                     | Jour de repos                            | Giorno libero                     |
| Schule                      | École                                    | Scuola                            |
| Verletzt/Unfall             | Blessé/accident                          | Ferito/incidente                  |

Observations:

- No pagination wrapper - plain `items` array, no `totalItemsCount`.
- `translations` has no `en` key; English is not maintained in VolleyManager.
- `_permissions.object.delete` is `false` for referees (reasons are association config).
- There is no English default: `description` equals one of the translation values.

## Implementation Status in VolleyKit

The web app's read-only **Absences** page (`packages/web/src/features/absences/`) uses
`refereeabsence/search` via `api.searchAbsences()` in `packages/web/src/api/real-api.ts`.
The request the app sends is a POST with **no body at all** - no form Content-Type and
no `__csrfToken` (the action does not enforce CSRF; the session cookie suffices):

```
POST /api/indoorvolleyball.refadmin/api\refereeabsence/search
```

**Smoke-tested 2026-08-31** (four rounds). This controller rejects or mishandles
request bodies that every other VolleyManager search endpoint accepts:

- `propertyFilters` (a `fromDate` dateRange) or `propertyOrderings` → **500 Internal
  Server Error**.
- `offset`/`limit` only → **200**, but the server clamps the page to **10 rows**
  regardless of the requested limit (`limit=100` returned 10 items of
  `totalItemsCount: 54`).
- A urlencoded body carrying **only `__csrfToken`** → **500** (smoke-tested from the
  deployed app).
- **No body at all** → **200 with the complete list** (all 54 items in one response),
  `_permissions` per item, ordered `fromDate` descending. This matches VolleyManager's
  own page, whose copy-as-cURL carries no body.

Note the asymmetry between the last three rows: the `offset`/`limit` body (which also
carried `__csrfToken`) returned 200, while a body carrying _only_ `__csrfToken` 500s.
`offset`/`limit` is the only body observed to return 200, and it truncates; every other
body tried 500s. No body at all is the only shape that returns the complete list.

No `propertyRenderConfiguration` is sent - the captured responses returned all needed
fields (including `_permissions`) without one. Responses are parsed with
`refereeAbsencesResponseSchema` (`packages/shared/src/api/schemas/absences.ts`, resilient
per-item parsing). `getForbiddenBlockageDateRanges` and
`refereeabsencereason/listWithNestedObjects` are documented in the OpenAPI spec but not
used by the app (they feed VolleyManager's create form, which VolleyKit does not offer).

## Open Questions

- `forbiddenDateRanges` with actual entries not yet observed - empty for both captured
  associations (captured before season start; ranges may appear later in the season).
  UI must handle the empty case as the common one, so the exact `DateRange` field shapes
  remain unverified against live data.
- Absence create/update/delete request formats not yet captured.
- Whether `refereeabsence/search` can return an `absenceReason` reference via
  `propertyRenderConfiguration` is unverified.
