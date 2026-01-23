# Game Details Endpoints

When clicking "Détails du match" (Match Details) from any list, 3 API calls are made:

## 1. Get Team Contact Info

Retrieves team manager contact information.

### Endpoint

```
GET /api/sportmanager.indoorvolleyball/api\game/getTeamContactInfosByGame
```

### Query Parameters

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| game      | UUID | The game identifier |

### Example Request

```
GET /api/sportmanager.indoorvolleyball/api\game/getTeamContactInfosByGame?game=<game-uuid>
```

### Response (Hypothesized structure based on dialog)

```json
{
  "teamHome": {
    "contacts": [
      {
        "name": "[Contact Name]",
        "email": "contact1@example.com",
        "phone": "+41 XX XXX XX XX"
      },
      {
        "name": "[Contact Name]",
        "email": "contact2@example.com",
        "phone": "+41 XX XXX XX XX"
      }
    ]
  },
  "teamAway": {
    "contacts": [
      {
        "name": "[Contact Name]",
        "email": "contact3@example.com",
        "phone": "+41 XX XXX XX XX"
      }
    ]
  }
}
```

---

## 2. Get Referee Game Info

Retrieves referee assignment information for the game.

### Endpoint

```
GET /api/sportmanager.indoorvolleyball/api\game/getRefereeGameByGame
```

### Query Parameters

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| game      | UUID | The game identifier |

### Example Request

```
GET /api/sportmanager.indoorvolleyball/api\game/getRefereeGameByGame?game=<game-uuid>
```

### Response (Hypothesized structure)

```json
{
  "__identity": "<referee-game-uuid>",
  "game": {
    "__identity": "<game-uuid>"
  },
  "referees": {
    "headOne": {
      "name": "[Referee Name]",
      "email": "referee1@example.com"
    },
    "headTwo": {
      "name": "[Referee Name]",
      "email": "referee2@example.com",
      "phone": "+41 XX XXX XX XX"
    }
  }
}
```

---

## 3. Show Game with Nested Objects

Retrieves detailed game information with specified nested properties.

### Endpoint

```
GET /api/sportmanager.indoorvolleyball/api\game/showWithNestedObjects
```

### Query Parameters

| Parameter                     | Type  | Description                       |
| ----------------------------- | ----- | --------------------------------- |
| game[\_\_identity]            | UUID  | The game identifier               |
| propertyRenderConfiguration[] | Array | List of property paths to include |

### Example Request

```
GET /api/sportmanager.indoorvolleyball/api\game/showWithNestedObjects
  ?game[__identity]=<game-uuid>
  &propertyRenderConfiguration[0]=number
  &propertyRenderConfiguration[1]=group.phase.league.leagueCategory.displayNameWithManagingAssociationShortName
  &propertyRenderConfiguration[2]=group.phase.league.displayName
  &propertyRenderConfiguration[3]=group.phase.league.genderUnicodeSign
  &propertyRenderConfiguration[4]=group.phase.displayName
  &propertyRenderConfiguration[5]=group.displayName
  &propertyRenderConfiguration[6]=gameDayIndex
  &propertyRenderConfiguration[7]=startingDateTime
  &propertyRenderConfiguration[8]=hall.displayName
  &propertyRenderConfiguration[9]=hall.primaryPostalAddress.streetAndHouseNumber
  &propertyRenderConfiguration[10]=hall.primaryPostalAddress.combinedAddress
  &propertyRenderConfiguration[11]=hall.primaryPostalAddress.additionToAddress
  &propertyRenderConfiguration[12]=hall.primaryPostalAddress.postalCodeAndCity
  &propertyRenderConfiguration[13]=hall.primaryPostalAddress.geographicalLocation.plusCode
  &propertyRenderConfiguration[14]=encounter.teamHomeGroupRankDisplayName
  &propertyRenderConfiguration[15]=encounter.teamHome.displayName
  &propertyRenderConfiguration[16]=encounter.teamHomeDefinitive
  &propertyRenderConfiguration[17]=encounter.teamAwayGroupRankDisplayName
  &propertyRenderConfiguration[18]=encounter.teamAwayDefinitive
  &propertyRenderConfiguration[19]=encounter.teamAway.displayName
  &propertyRenderConfiguration[20]=status
  &propertyRenderConfiguration[21]=result.summarizedResult
  &propertyRenderConfiguration[22]=result.summarizedSets
```

### Property Render Configuration Fields

| Index | Property Path                                                                 | Description                 |
| ----- | ----------------------------------------------------------------------------- | --------------------------- | ------------------- | --- |
| 0     | number                                                                        | Match number (e.g., 382215) |
| 1     | group.phase.league.leagueCategory.displayNameWithManagingAssociationShortName | "SVRZ                       | 2L"                 |
| 2     | group.phase.league.displayName                                                | "#6651                      | 2L                  | ♂"  |
| 3     | group.phase.league.genderUnicodeSign                                          | "♂" or "♀"                  |
| 4     | group.phase.displayName                                                       | "#13011                     | Hin- und Rückrunde" |
| 5     | group.displayName                                                             | "#27106                     | Herren 2. Liga"     |
| 6     | gameDayIndex                                                                  | Match day number (e.g., 4)  |
| 7     | startingDateTime                                                              | Game start date/time        |
| 8     | hall.displayName                                                              | "#74                        | [Hall Name]..."     |
| 9     | hall.primaryPostalAddress.streetAndHouseNumber                                | "[Street Address]"          |
| 10    | hall.primaryPostalAddress.combinedAddress                                     | Full address                |
| 11    | hall.primaryPostalAddress.additionToAddress                                   | Additional address info     |
| 12    | hall.primaryPostalAddress.postalCodeAndCity                                   | "[Postal Code] [City]"      |
| 13    | hall.primaryPostalAddress.geographicalLocation.plusCode                       | "[Plus Code]"               |
| 14    | encounter.teamHomeGroupRankDisplayName                                        | Group rank display          |
| 15    | encounter.teamHome.displayName                                                | "#2328                      | [Team Name]..."     |
| 16    | encounter.teamHomeDefinitive                                                  | Whether team is definitive  |
| 17    | encounter.teamAwayGroupRankDisplayName                                        | Group rank display          |
| 18    | encounter.teamAwayDefinitive                                                  | Whether team is definitive  |
| 19    | encounter.teamAway.displayName                                                | Away team display name      |
| 20    | status                                                                        | Game status                 |
| 21    | result.summarizedResult                                                       | Game result summary         |
| 22    | result.summarizedSets                                                         | Set scores                  |

---

## Match Details Dialog Content

The dialog displays:

| Field                | Example Value                          |
| -------------------- | -------------------------------------- | ---------------------------------- | -------------------------------------- |
| N° match             | #382215                                |
| Catégorie de ligue   | SVRZ                                   | 2L                                 |
| Ligue                | #6651                                  | 2L                                 | ♂                                      |
| Genre                | ♂                                      |
| Phase                | #13011                                 | Hin- und Rückrunde                 |
| Groupe               | #27106                                 | Herren 2. Liga                     |
| Jour de match        | 4                                      |
| Date/heure de début  | 13.12.2025 13:00                       |
| Salle                | #74                                    | [Hall Name]                        | [Street Address], [Postal Code] [City] |
| Plus code            | [Plus Code] (linked to Google Maps)    |
| Equipe recevante     | #2328                                  | [Team Name] (2L, ♂, SVRZ)          |
| Responsable d'équipe | Multiple contacts with email and phone |
| Equipe visiteuse     | #12849                                 | [Team Name] (2L, ♂, [Association]) |
| Responsable d'équipe | Multiple contacts with email and phone |
| Arbitres             | ARB 1, ARB 2 with emails and phones    |

---

## Game Object Fields

When retrieving full game details via `showWithNestedObjects`, the following fields are available:

### Core Fields

| Field            | Type     | Description                                              |
| ---------------- | -------- | -------------------------------------------------------- |
| \_\_identity     | UUID     | Game identifier                                          |
| number           | integer  | Match number                                             |
| status           | string   | Game status (e.g., "approved", "scheduled", "completed") |
| startingDateTime | datetime | Game start date/time                                     |
| playingWeekday   | string   | Day of week                                              |
| gameDayIndex     | integer  | Match day number in the season                           |
| displayName      | string   | Full formatted display name                              |
| shortDisplayName | string   | Short display name                                       |

### Nomination List Flags

| Field                                    | Type    | Description                                      |
| ---------------------------------------- | ------- | ------------------------------------------------ |
| hasNominationListToReviewByReferee       | boolean | Whether referee needs to review nomination lists |
| hasNominationListOfTeamHomeOfActiveParty | boolean | Whether active party has home team access        |
| hasNominationListOfTeamAwayOfActiveParty | boolean | Whether active party has away team access        |
| hasNominationListOfTeamOfActiveParty     | boolean | Whether active party has any team access         |

### Game Result Flags

| Field                                    | Type          | Description                    |
| ---------------------------------------- | ------------- | ------------------------------ |
| isForfeitGame                            | boolean       | Whether the game was forfeited |
| forfeitDecisionDateTime                  | datetime/null | When forfeit decision was made |
| hasGameResultReportFromHomeTeam          | boolean       | Home team submitted result     |
| hasGameResultReportFromAwayTeam          | boolean       | Away team submitted result     |
| hasGameResultReportFromReferee           | boolean       | Referee submitted result       |
| hasGameResultReportFromChampionshipOwner | boolean       | Owner submitted result         |
| homeTeamGameResultReportDeadlineExceeded | boolean       | Home team deadline exceeded    |
| awayTeamGameResultReportDeadlineExceeded | boolean       | Away team deadline exceeded    |
| refereeGameResultReportDeadlineExceeded  | boolean       | Referee deadline exceeded      |

### Group Fields

| Field                              | Type    | Description                         |
| ---------------------------------- | ------- | ----------------------------------- |
| group.isTournamentGroup            | boolean | Whether this is a tournament group  |
| group.hasNoScoresheet              | boolean | Whether games require no scoresheet |
| group.managingAssociationShortName | string  | Managing association (e.g., "SVRZ") |

---

## Notes

- The game UUID comes from the `refereeGame.game.__identity` field in the exchange/assignment response
- All 3 endpoints are called in parallel when opening the dialog
- The Plus code is linked to Google Maps: `https://maps.google.com/?q=[Plus Code]&hl=fr`
- Contact info includes email (mailto: links) and phone (tel: links)
- The `isTournamentGroup` flag affects nomination list requirements for subsequent games
