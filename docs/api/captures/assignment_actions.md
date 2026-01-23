# Assignment Actions

## Popup Menu Actions

When clicking the "more_horiz" (⋯) button on an assignment row in "Mes convocations", a popup menu appears with:

### Available Actions

| Action (FR)                      | Action (EN)                | Icon                   | Description                                        |
| -------------------------------- | -------------------------- | ---------------------- | -------------------------------------------------- |
| Rechercher ARB évtl. disponibles | Search available referees  | sports                 | Find referees who might be available for this game |
| Informations de convocation      | Assignment information     | info                   | View detailed assignment/convocation info          |
| Editer les frais et l'indemnité  | Edit fees and compensation | commute                | Modify travel expenses and game compensation       |
| Ajouter convocation à la bourse  | Add to exchange            | published_with_changes | Post this assignment to the exchange marketplace   |

### Conditional/Disabled Actions

| Action (FR)                                            | Action (EN)                             | Icon            | Condition                                    |
| ------------------------------------------------------ | --------------------------------------- | --------------- | -------------------------------------------- |
| Les listes d'engagement sont gérées par le 1er arbitre | Engagement lists managed by 1st referee | manage_accounts | Shown when user is ARB 2 (not first referee) |
| Annoncer résultat                                      | Announce result                         | scoreboard      | Only available after game is played          |

---

## Action Endpoints (To Be Captured)

### 1. Informations de convocation

Likely uses the same 3 endpoints as match details:

- `GET /api/sportmanager.indoorvolleyball/api\game/getTeamContactInfosByGame`
- `GET /api/sportmanager.indoorvolleyball/api\game/getRefereeGameByGame`
- `GET /api/sportmanager.indoorvolleyball/api\game/showWithNestedObjects`

### 2. Editer les frais et l'indemnité

Opens compensation editing form.

**Endpoint (confirmed):**

```
PUT /api/indoorvolleyball.refadmin/api\convocationcompensation
```

**Request format:**

IMPORTANT: The `__identity` must be nested inside `convocationCompensation`, not at root level!

```
convocationCompensation[__identity]=<compensation-uuid>
&convocationCompensation[distanceInMetres]=56000
&convocationCompensation[correctionReason]=<reason-text>
&convocationCompensation[payTravelExpenses]=1
&convocationCompensation[travelExpensesPercentageWeighting]=1
&__csrfToken=<token>
```

### 3. Ajouter convocation à la bourse

Posts the assignment to the exchange marketplace.

**Endpoint (hypothesized):**

```
POST /api/indoorvolleyball.refadmin/api\refereegameexchange
```

**Request format:**

```
refereeConvocation[__identity]=<convocation-uuid>
&__csrfToken=<token>
```

### 4. Rechercher ARB évtl. disponibles

Searches for available referees. May show a dialog or navigate to a search page.

**Endpoint (hypothesized):**

```
GET /api/indoorvolleyball.refadmin/api\indoorassociationreferee/searchAvailable
?game=<game-uuid>
&position=<referee-position>
```

### 5. Annoncer résultat

Submit game result (only available for completed games when user is first referee).

**Endpoint (hypothesized):**

```
POST /api/sportmanager.indoorvolleyball/api\gameresult
```

---

## Notes

- Actions are context-sensitive based on:
  - User's role (ARB 1 vs ARB 2)
  - Game status (future vs past)
  - Whether user has already added to exchange
- The `_permissions` field in the assignment response indicates which actions are available
