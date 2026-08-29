# Game Exchanges API (Bourse aux arbitrages)

## Endpoint

```
POST /api/indoorvolleyball.refadmin/api\refereegameexchange/search
```

## Request Format

Form-encoded POST body with the following parameters:

### Observed Parameters (from browser network logs)

```
searchConfiguration[propertyFilters][0][propertyName]: refereeGame.game.startingDateTime
searchConfiguration[propertyFilters][0][dateRange][from]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[propertyFilters][0][dateRange][to]: YYYY-MM-DDTHH:MM:SS.000Z
searchConfiguration[propertyFilters][1][propertyName]: status
searchConfiguration[propertyFilters][1][enumValues][0]: open
searchConfiguration[customFilters]: (empty)
searchConfiguration[propertyOrderings]: (empty - no default sorting)
searchConfiguration[offset]: 0
searchConfiguration[limit]: 10
searchConfiguration[textSearchOperator]: AND
__csrfToken: <token_value>
```

## Response Format

JSON response with structure:

```json
{
  "items": [
    {
      "game": {
        "startingDateTime": "2025-12-13T13:00:00+01:00",
        "number": "382215",
        "league": "2L",
        "gender": "m",
        "teamHome": {
          "name": "[Team Name]"
        },
        "teamAway": {
          "name": "[Team Name]"
        }
      },
      "position": "ARB 1",
      "requiredLevel": "N3",
      "requiredQualification": "1",
      "status": "open",
      "submittedBy": {
        "firstName": "[First Name]",
        "lastName": "[Last Name]"
      },
      "appliedBy": {
        "firstName": "[First Name]",
        "lastName": "[Last Name]"
      }
    }
  ],
  "pagination": {
    "totalItems": 7,
    "currentPage": 1,
    "itemsPerPage": 50
  }
}
```

## Test Data

### Example 1: Exchange Entry

- Date: 2025-12-13, 13:00 (Saturday)
- Status: Open
- Position: ARB 1
- Required Level: N3
- Required Qualification: 1
- Match #: 382215
- League: 2L
- Gender: Male
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]
- Applied By: (none yet)

### Example 2: Exchange Entry

- Date: 2026-01-16, 20:15 (Friday)
- Status: Open
- Position: ARB 1
- Required Level: N4
- Required Qualification: 3
- Match #: 383053
- League: 5L
- Gender: Female
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: (empty)

### Example 3: Exchange Entry

- Date: 2026-01-17, 14:00 (Saturday)
- Status: Open
- Position: ARB 1
- Required Level: N3
- Required Qualification: 2
- Match #: 382316
- League: 3L
- Gender: Male
- Home: [Home Team]
- Away: [Away Team]
- ARB 1: [Referee Name]
- ARB 2: [Referee Name]

(+ 4 more examples observed with 7 total items)

## Actions

### Take Over Exchange (Confirmed)

See [exchange_actions.md](captures/exchange_actions.md) for confirmed API documentation.

```
PUT /api/indoorvolleyball.refadmin/api\refereegameexchange/pickFromRefereeGameExchange
```

Form data:

```
refereeGameExchange[__identity]: <exchange_uuid>
__csrfToken: <token>
```

### Remove Own Exchange (Confirmed)

```
POST /api/indoorvolleyball.refadmin/api\refereeconvocation/deleteFromRefereeGameExchange
```

Form data:

```
refereeConvocations[0][__identity]: <convocation_uuid>
__csrfToken: <token>
```

## Take-over Permission (`_permissions`)

Each item in the response carries the server's verdict on whether the signed-in
referee may take that entry over:

```json
{
  "_permissions": {
    "properties": {
      "appliedBy": { "update": false }
    }
  }
}
```

- `true`: the referee can apply (`pickFromRefereeGameExchange` succeeds)
- `false`: a backend rule blocks them, and applying anyway is rejected

The backend does not say which rule fired, and the clients do not try to
reproduce it - the field is taken as the server's answer.

Observed in a capture from a Swiss Volley Region Zurich referee cleared up to
and including National League B (2026-08-29, all 10 entries in the same regional
association):

| Games                                  | `update` | League      | `requiredRefereeLevel` |
| -------------------------------------- | -------- | ----------- | ---------------------- |
| 406907, 405628, 406403, 406830, 405659 | `false`  | 4L, 5L      | N4                     |
| 406305, 406720, 406221, 406995, 406159 | `true`   | 2L, 3L, U23 | N3                     |

So the flag tracked the _lower_ league boundary, not the referee's upper
clearance: the region appears to keep 4L/5L entries for its own club referees.

Two rival explanations are ruled out by that same capture:

- **Team registration / club affiliation**: four distinct home clubs are blocked,
  and VBC Einsiedeln sits on both sides of the split (D3 blocked, D2 and H2
  takeable).
- **Distance from home**: Sporthalle Brüel in 8840 Einsiedeln hosts both a
  blocked entry (405659, 5L) and two takeable ones (406221 and 406995, 2L).

### Which rules feed the flag

`GET .../refereeassociationsettings/getRefereeAssociationSettingsOfActiveParty`
(already fetched by the clients) exposes the association's exchange
configuration. The fields that decide who may catch a game:

| Field                                                            | Zurich value                                         | Effect                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `usesGameExchange`                                               | `true`                                               | The exchange exists for this association                                                |
| `allowedRefereeTypesForGameExchange`                             | `["head-two", "head-one"]`                           | Only head referee entries can be exchanged - no linesman entries                        |
| `hoursBeforeGameStartIgnoringConvocationCriteriaInGameExchange`  | `72`                                                 | Inside 72h before game start the convocation criteria stop being enforced               |
| `allowGameExchangeCatchingOfFlaggedRefereeXHoursBeforeGameStart` | `72`                                                 | Same window for referees flagged as systematically delayed                              |
| `maxDistanceInKmBetweenRefereeAndHall`                           | `50`                                                 | Distance criterion                                                                      |
| `basisToConsiderRefereeHome`                                     | `["", "hasValidatedPlayerOrCoachLicenseOfHomeClub"]` | A referee holding a validated player or coach license of the home club counts as "home" |
| `refereeMandateAllocationType`                                   | `"club"`                                             | Referee mandates are allocated per club, not per team                                   |
| `clubsThisRefereeIsNotAllowedToArbitrate` (referee data)         | visible, not editable                                | Explicit club ban                                                                       |
| `teamsThisRefereeIsNotAllowedToArbitrate` (referee data)         | visible, not editable                                | Explicit team ban                                                                       |
| `mayNotRefereeMatchForGender` (referee data)                     | visible, not editable                                | Gender restriction                                                                      |

So `appliedBy.update` is the outcome of the whole convocation-criteria check for
that referee and that game - level, distance, gender, club/team bans and the
home-club conflict of interest all collapse into the one boolean. The response
never says which criterion fired.

Because the criteria stop applying 72h before game start, the same entry can flip
from `false` to `true` as the game approaches. The clients re-read the flag on
every fetch, so this needs no client-side handling.

The search endpoint returns every open entry regardless of this flag, so the
clients filter on it: entries with `update: false` are dropped from the Open tab.
Own entries are kept - they carry `update: false` too, yet must stay visible so
the submitter can pull them back off the marketplace. An entry without the flag
is treated as takeable so a missing property never empties the list.

### Do not request `_permissions` on this endpoint

The block arrives unasked, and asking for it breaks the search. Listing
`_permissions` in `propertyRenderConfiguration` makes the endpoint answer
`500` with:

```
In path _permissions: The field _permissions on Indoorvolleyball\RefAdmin\Domain\Model\RefereeGameExchange
neither exists in the DB nor does it have a custom select expression or property value provider
```

Every render path is resolved against the domain model, and `_permissions` is a
framework-level path, not a model property - so the search fails outright rather
than ignoring the unknown path. `propertyRenderConfiguration` therefore lists
domain paths only; the permission block is read off the response.

The official client omits it too:
[captures/exchanges_request.txt](captures/exchanges_request.txt) is an
official-site search with 48 render paths and no `_permissions`, yet responses
captured from that site carry the block per entry (the 10-entry table above,
from a later session). The sibling endpoints are captured the same way - neither
[captures/assignments_request.txt](captures/assignments_request.txt) nor
[captures/compensations_request.txt](captures/compensations_request.txt) asks
for `_permissions`, and both schemas have parsed the block off their responses
since #971.

If a future backend change stops returning the block, every entry loses its flag
and is treated as takeable - the filter turns into a no-op, which keeps the Open
tab populated rather than emptying it.

## Notes

- Date filtering uses `propertyFilters` with `refereeGame.game.startingDateTime`
- Status filter uses `enumValues`: open, applied, closed
- Pagination uses `offset`/`limit` (not page-based)
- No default sorting (propertyOrderings is empty)
- Shows exchanges where referees can take over positions
- Filtered by required qualification level (referee can only see exchanges they're qualified for)
- When a referee takes over an exchange, it becomes theirs immediately
