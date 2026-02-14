# Nomination List Endpoints

Nomination lists contain the team lineup for a game, including players, coaches, and assistant coaches. Both teams must have their nomination lists finalized before the game.

## Workflow Overview

1. **Load Nomination List** - Part of game details with nested objects
1. **Get Possible Players** - Fetch eligible players for nomination
1. **Update Nomination List** - Add/remove players and coaches
1. **Finalize Nomination List** - Lock the list (by team or referee)

---

## 1. Update Nomination List

Updates an existing nomination list with player nominations and coach assignments.

### Endpoint

```
PUT /api/sportmanager.indoorvolleyball/api\nominationlist
```

### Request

Content-Type: `text/plain;charset=UTF-8` (URL-encoded body despite text/plain Content-Type)

| Parameter                                                | Type     | Description                               |
| -------------------------------------------------------- | -------- | ----------------------------------------- |
| nominationList[\_\_identity]                             | UUID     | The nomination list identifier            |
| nominationList[game][\_\_identity]                       | UUID     | The game identifier                       |
| nominationList[team][\_\_identity]                       | UUID     | The team identifier                       |
| nominationList[coachPerson][\_\_identity]                | UUID     | Head coach person ID                      |
| nominationList[firstAssistantCoachPerson][\_\_identity]  | UUID     | First assistant coach (optional)          |
| nominationList[firstAssistantCoachPerson]                | string   | Empty string when no assistant coach      |
| nominationList[secondAssistantCoachPerson]               | string   | Second assistant coach UUID or empty      |
| nominationList[indoorPlayerNominations][N][\_\_identity] | UUID     | Player nomination IDs (array)             |
| nominationList[closed]                                   | boolean  | Whether the list is closed                |
| nominationList[closedAt]                                 | datetime | When closed (empty if open)               |
| nominationList[closedBy]                                 | string   | Who closed it (empty if open)             |
| nominationList[checked]                                  | boolean  | Whether checked by referee                |
| nominationList[checkedAt]                                | datetime | When checked (empty if not checked)       |
| nominationList[checkedBy]                                | string   | Who checked it (empty if not checked)     |
| nominationList[isClosedForTeam]                          | boolean  | Whether team can still edit               |
| nominationList[isSubsequentGameForTeamInTournamentGroup] | boolean  | Whether second/third game in tournament   |
| nominationList[lastUpdatedByRealUser]                    | boolean  | Marks update as user-initiated            |
| nominationList[nominationListValidation][\_\_identity]   | UUID     | Validation record                         |
| nominationList[notFoundButNominatedPersons]              | string   | Unmatched persons (empty if none)         |
| nominationList[persistenceObjectIdentifier]              | UUID     | Same as \_\_identity (Neos Flow internal) |
| \_\_csrfToken                                            | string   | CSRF protection token                     |

### Example Request (URL-decoded)

```
nominationList[__identity]=<nomination-list-uuid>
nominationList[checked]=false
nominationList[checkedAt]=
nominationList[checkedBy]=
nominationList[closed]=false
nominationList[closedAt]=
nominationList[closedBy]=
nominationList[coachPerson][__identity]=<coach-person-uuid>
nominationList[firstAssistantCoachPerson]=
nominationList[game][__identity]=<game-uuid>
nominationList[indoorPlayerNominations][0][__identity]=<player-nomination-0-uuid>
nominationList[indoorPlayerNominations][1][__identity]=<player-nomination-1-uuid>
nominationList[indoorPlayerNominations][2][__identity]=<player-nomination-2-uuid>
...
nominationList[isClosedForTeam]=true
nominationList[isSubsequentGameForTeamInTournamentGroup]=false
nominationList[lastUpdatedByRealUser]=true
nominationList[nominationListValidation][__identity]=<validation-uuid>
nominationList[notFoundButNominatedPersons]=
nominationList[persistenceObjectIdentifier]=<nomination-list-uuid>
nominationList[secondAssistantCoachPerson]=
nominationList[team][__identity]=<team-uuid>
__csrfToken=<csrf-token>
```

### Response

Returns the updated nomination list with all nested objects.

```json
{
  "__identity": "<nomination-list-uuid>",
  "game": {
    "__identity": "<game-uuid>"
  },
  "team": {
    "__identity": "<team-uuid>",
    "displayName": "#1234 | [Team Name] (2L, ♂, SVRZ)"
  },
  "coachPerson": {
    "__identity": "<person-uuid>",
    "displayName": "[Coach Name]",
    "firstName": "[First]",
    "lastName": "[Last]"
  },
  "firstAssistantCoachPerson": {
    "__identity": "<person-uuid>",
    "displayName": "[Assistant Name]"
  },
  "secondAssistantCoachPerson": null,
  "indoorPlayerNominations": [
    {
      "__identity": "<nomination-uuid>",
      "indoorPlayer": {
        "__identity": "<player-uuid>",
        "person": {
          "__identity": "<person-uuid>",
          "displayName": "[Player Name]",
          "birthday": "1995-03-15T00:00:00.000000+00:00"
        }
      },
      "shirtNumber": 7,
      "isCaptain": true,
      "isLibero": false,
      "indoorPlayerLicenseCategory": {
        "shortName": "SEN"
      }
    }
  ],
  "closed": false,
  "closedAt": null,
  "closedBy": null,
  "checked": false,
  "checkedAt": null,
  "checkedBy": null,
  "isClosedForTeam": true,
  "nominationListValidation": {
    "__identity": "<validation-uuid>",
    "hasValidationIssues": false,
    "nominationListValidationIssues": []
  },
  "_permissions": {
    "object": { "create": true, "update": true, "delete": false },
    "properties": { ... }
  }
}
```

---

## 2. Finalize Nomination List

Finalizes and closes a nomination list. Once finalized by the referee, it becomes read-only for the team.

### Endpoint

```
POST /api/sportmanager.indoorvolleyball/api\nominationlist/finalize
```

### Request

Content-Type: `text/plain;charset=UTF-8` (URL-encoded body despite text/plain Content-Type)

Same parameters as update, with:

- `nominationList[isClosedForTeam]` = `true`
- `nominationList[closed]` = `false` (will be set to true after finalization)

### Response

Returns a wrapper object with the finalized nomination list.

```json
{
  "nominationList": {
    "__identity": "<nomination-list-uuid>",
    "closed": true,
    "closedAt": "2025-12-10T20:53:56.000000+00:00",
    "closedBy": "referee",
    "checked": false,
    "isClosedForTeam": true,
    "coachPerson": { ... },
    "indoorPlayerNominations": [ ... ],
    "_permissions": {
      "object": { "create": false, "update": false, "delete": false },
      "properties": { ... }
    }
  }
}
```

### Who Can Finalize

| Role             | Can Finalize | Notes                           |
| ---------------- | ------------ | ------------------------------- |
| Team Responsible | Yes          | Before game, for their own team |
| Referee          | Yes          | At game time, for both teams    |
| Club Admin       | Yes          | For teams in their club         |

---

## 3. Get Possible Player Nominations

Returns a list of players eligible to be nominated for the given nomination list.

### Endpoint

```
POST /api/sportmanager.indoorvolleyball/api\nominationlist/getPossibleIndoorPlayerNominationsForNominationList
```

### Request

Content-Type: `application/x-www-form-urlencoded`

| Parameter          | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| nominationList     | UUID    | The nomination list identifier           |
| onlyFromMyTeam     | boolean | Only show players from the team          |
| onlyRelevantGender | boolean | Only show players matching league gender |
| \_\_csrfToken      | string  | CSRF protection token                    |

### Example Request

```
nominationList=<nomination-list-uuid>
onlyFromMyTeam=true
onlyRelevantGender=true
__csrfToken=<csrf-token>
```

### Response

```json
{
  "items": [
    {
      "__identity": "<possible-nomination-uuid>",
      "indoorPlayer": {
        "__identity": "<player-uuid>",
        "person": {
          "__identity": "<person-uuid>",
          "displayName": "[Player Name]",
          "firstName": "[First]",
          "lastName": "[Last]",
          "birthday": "1998-05-20T00:00:00.000000+00:00"
        }
      },
      "licenseCategory": "SEN",
      "isAlreadyNominated": false
    },
    {
      "__identity": "<possible-nomination-uuid>",
      "indoorPlayer": { ... },
      "licenseCategory": "JUN",
      "isAlreadyNominated": true
    }
  ],
  "totalItemsCount": 25
}
```

---

## 4. Get Persons with Valid Licenses

Returns all persons who have a validated player, coach, or referee license in the active season. Used for autocomplete when adding coaches or emergency referees.

### Endpoint

```
GET /api/sportmanager.indoorvolleyball/api\nominationlist/getPersonsWithValidatedPlayerOrCoachOrRefereeLicenseInActiveSeason
```

### Request

No parameters required (uses session context).

### Response

```json
[
  {
    "__identity": "<person-uuid>",
    "displayName": "[Person Name]",
    "associationId": 12345,
    "birthday": "1975-02-07T00:00:00.000000+00:00"
  },
  {
    "__identity": "<person-uuid>",
    "displayName": "[Another Person]",
    "associationId": 67890,
    "birthday": "1988-11-23T00:00:00.000000+00:00"
  }
]
```

### Usage

This endpoint returns a large list (all licensed persons). The frontend typically:

1. Caches this list on first load
1. Uses it for client-side filtering in autocomplete fields
1. Matches by `displayName` or `associationId`

---

## Player Nomination Fields

Each player nomination contains:

| Field                            | Type        | Description                                   |
| -------------------------------- | ----------- | --------------------------------------------- |
| \_\_identity                     | UUID        | Nomination record ID                          |
| indoorPlayer                     | object      | Reference to the player                       |
| shirtNumber                      | integer     | Jersey number for the game                    |
| isCaptain                        | boolean     | Team captain designation                      |
| isLibero                         | boolean     | Libero player designation                     |
| isEligible                       | boolean     | Whether the player is eligible to play        |
| doubleLicenseTeam                | object/null | Team reference if player has a double license |
| indoorPlayerLicenseCategory      | object      | License category (SEN, JUN, etc.)             |
| indoorPlayerNominationValidation | object      | Validation issues for this player             |

### Indoor Player Fields

The `indoorPlayer` object contains:

| Field                         | Type    | Description                                       |
| ----------------------------- | ------- | ------------------------------------------------- |
| \_\_identity                  | UUID    | Player record ID                                  |
| person                        | object  | Person details (name, birthday, etc.)             |
| hasAcceptedDopingDeclaration  | boolean | Whether player accepted doping declaration        |
| hasActivatedIndoorLicense     | boolean | Whether indoor license is activated               |
| hasValidatedIndoorLicense     | boolean | Whether indoor license is validated               |
| hasPlayerPicture              | boolean | Whether player has a profile picture              |
| isClassifiedAsLocallyEducated | boolean | Locally educated classification (foreigner rules) |
| isForeignerRegardingGamePlay  | boolean | Counts as foreigner for game play rules           |
| totalLicensesCount            | integer | Total licenses held by the player                 |

### License Categories

| Code | Description |
| ---- | ----------- |
| SEN  | Senior      |
| JUN  | Junior      |
| U23  | Under 23    |
| U21  | Under 21    |
| U19  | Under 19    |
| U17  | Under 17    |

---

## Validation Issues

Player nominations can have validation issues:

```json
{
  "indoorPlayerNominationValidation": {
    "__identity": "<validation-uuid>",
    "hasValidationIssues": true,
    "hasUnresolvedValidationIssues": true,
    "hasValidationIssuesForAssociationUserContext": true,
    "hasValidationIssuesForClubUserContext": false,
    "indoorPlayerNominationValidationIssues": [
      {
        "__identity": "<issue-uuid>",
        "validationIssueConfiguration": {
          "hideForUserContexts": ["club"]
        }
      }
    ],
    "gameOfOtherNominationOnSameDay": {
      "__identity": "<other-game-uuid>",
      "number": 382456,
      "startingDateTime": "2025-12-10T14:00:00.000000+00:00"
    }
  }
}
```

### Common Validation Issues

- Player already nominated for another game on same day
- License not valid for this league category
- Age restriction violations
- Missing required license

---

## Notes

- Each game has two nomination lists: one for home team, one for away team
- Nomination lists are created automatically when the game is scheduled
- Teams can modify their list until it's finalized or game time approaches
- Referees control the final nomination at the venue
- The `isClosedForTeam` flag prevents team modifications while allowing referee edits
- `notFoundButNominatedPersons` handles cases where a person isn't in the system
- `isSubsequentGameForTeamInTournamentGroup` is true for second/third games in a tournament group, which may have different nomination requirements
