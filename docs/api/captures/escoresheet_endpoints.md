# eScoresheet Endpoints

The electronic scoresheet (eScoresheet) functionality allows referees to manage game scoresheets digitally. This involves updating scoresheet data, validating it, uploading a PDF, and finalizing it.

## Workflow Overview

1. **Access eScoresheet** - Opens the scoresheet interface for a game
1. **Update Scoresheet** - Save changes to the scoresheet (writer person, validation status)
1. **Validate Scoresheet** - Check for validation issues before finalization
1. **Upload PDF** - Upload the signed scoresheet PDF
1. **Finalize Scoresheet** - Close the scoresheet permanently

---

## 1. Update Scoresheet

Saves changes to an existing scoresheet.

### Endpoint

```
POST /api/sportmanager.indoorvolleyball/api\scoresheet
```

### Request

Content-Type: `text/plain;charset=UTF-8` (URL-encoded body despite text/plain Content-Type)

| Parameter                                        | Type     | Description                                  |
| ------------------------------------------------ | -------- | -------------------------------------------- |
| scoresheet[game][\_\_identity]                   | UUID     | The game identifier                          |
| scoresheet[isSimpleScoresheet]                   | boolean  | Whether using simplified scoresheet          |
| scoresheet[writerPerson][\_\_identity]           | UUID     | Person filling out the scoresheet (optional) |
| scoresheet[writerPerson]                         | string   | Empty string when no scorer set              |
| scoresheet[file][\_\_identity]                   | UUID     | Reference to uploaded file (optional)        |
| scoresheet[hasFile]                              | boolean  | Whether a file is attached                   |
| scoresheet[scoresheetValidation][\_\_identity]   | UUID     | Validation record reference (optional)       |
| scoresheet[scoresheetValidation]                 | string   | Empty string when no validation yet          |
| scoresheet[reminderAboutOpenScoresheetSentAt]    | string   | Reminder timestamp (empty if not sent)       |
| scoresheet[closedAt]                             | datetime | When closed (empty if open)                  |
| scoresheet[closedBy]                             | string   | Who closed it (empty if open)                |
| scoresheet[emergencySubstituteReferees]          | string   | Emergency referees (empty if none)           |
| scoresheet[notFoundButNominatedPersons]          | string   | Unmatched persons (empty if none)            |
| \_\_csrfToken                                    | string   | CSRF protection token                        |

Note: The scoresheet identity is NOT sent in the body. The server resolves it from the game identity.
When a field has no value (e.g., writerPerson before scorer selection), the plain field name is used
without `[__identity]` suffix.

### Example Request (URL-decoded)

```
scoresheet[game][__identity]=<game-uuid>
scoresheet[isSimpleScoresheet]=false
scoresheet[writerPerson]=
scoresheet[scoresheetValidation]=
scoresheet[reminderAboutOpenScoresheetSentAt]=
scoresheet[notFoundButNominatedPersons]=
scoresheet[emergencySubstituteReferees]=
scoresheet[closedAt]=
scoresheet[closedBy]=
scoresheet[file][__identity]=<file-resource-uuid>
scoresheet[hasFile]=false
__csrfToken=<csrf-token>
```

### Response

Returns the updated scoresheet object with all properties and permissions.

```json
{
  "__identity": "<scoresheet-uuid>",
  "game": {
    "__identity": "<game-uuid>"
  },
  "isSimpleScoresheet": false,
  "writerPerson": {
    "__identity": "<person-uuid>",
    "displayName": "[Referee Name]"
  },
  "scoresheetValidation": {
    "__identity": "<validation-uuid>",
    "hasValidationIssues": true,
    "scoresheetValidationIssues": []
  },
  "file": null,
  "hasFile": false,
  "closedAt": null,
  "closedBy": null,
  "createdAt": "2025-12-10T20:50:51.000000+00:00",
  "createdBy": "[username]",
  "updatedAt": "2025-12-10T20:51:30.000000+00:00",
  "updatedBy": "[username]",
  "_permissions": {
    "object": { "create": true, "update": true, "delete": false },
    "properties": { ... }
  }
}
```

---

## 2. Validate Scoresheet

Validates the scoresheet and returns any issues that need to be addressed.

### Endpoint

```
POST /api/sportmanager.indoorvolleyball/api\scoresheet/validateScoresheet
```

### Request

Content-Type: `application/x-www-form-urlencoded`

| Parameter                               | Type    | Description                         |
| --------------------------------------- | ------- | ----------------------------------- |
| scoresheet[game][\_\_identity]          | UUID    | The game identifier                 |
| scoresheet[isSimpleScoresheet]          | boolean | Whether using simplified scoresheet |
| scoresheet[writerPerson][\_\_identity]  | UUID    | Person filling out the scoresheet   |
| scoresheet[scoresheetValidation]        | string  | Empty for initial validation        |
| scoresheet[notFoundButNominatedPersons] | string  | Empty if none                       |
| scoresheet[emergencySubstituteReferees] | string  | Empty if none                       |
| scoresheet[closedAt]                    | string  | Empty if open                       |
| scoresheet[closedBy]                    | string  | Empty if open                       |
| scoresheet[file]                        | string  | Empty if no file                    |
| scoresheet[hasFile]                     | boolean | false if no file attached           |
| \_\_csrfToken                           | string  | CSRF protection token               |

### Response

Returns the validation result with any issues found.

```json
{
  "__identity": "<validation-uuid>",
  "hasValidationIssues": true,
  "hasValidationIssuesForAssociationUserContext": true,
  "hasValidationIssuesForClubUserContext": true,
  "areValidationIssuesAddressedByChampionshipOperator": false,
  "scoresheetValidationIssues": [
    {
      "__identity": "<issue-uuid>",
      "validationIssueConfiguration": {
        "__identity": "<config-uuid>",
        "hideForUserContexts": ["club"]
      },
      "createdAt": null
    }
  ],
  "createdAt": null,
  "updatedAt": null
}
```

### Validation Issue Types

Common validation issues include:

- Missing scoresheet PDF file
- Nomination list not finalized
- Missing required signatures
- Data inconsistencies

---

## 3. Upload Scoresheet File

Uploads the signed scoresheet file (JPEG, PNG, or PDF).

### Endpoint

```
POST /api/sportmanager.resourcemanagement/api\persistentresource/upload
```

### Request

Content-Type: `multipart/form-data`

| Parameter          | Type   | Description                       |
| ------------------ | ------ | --------------------------------- |
| scoresheetFile[]   | file   | The scoresheet file to upload     |
| \_\_csrfToken      | string | CSRF protection token (optional)  |

Note: The volleymanager website does not include a CSRF token in the upload request body.
The field name uses array notation (`scoresheetFile[]`).

### Response

Returns an array with the uploaded file resource.

```json
[
  {
    "__identity": "<file-resource-uuid>",
    "persistentResource": {
      "__identity": "<persistent-resource-uuid>",
      "filename": "scoresheet.pdf",
      "mediaType": "application/pdf",
      "fileSize": 245678
    },
    "publicResourceUri": "https://volleymanager.volleyball.ch/_Resources/Persistent/<hash>/scoresheet.pdf",
    "createdAt": "2025-12-10T20:52:14.000000+00:00",
    "createdBy": "[username]",
    "updatedAt": "2025-12-10T20:52:14.000000+00:00",
    "_permissions": {
      "object": { "create": true, "read": true, "update": true, "delete": true },
      "properties": { ... }
    }
  }
]
```

---

## 4. Finalize Scoresheet

Finalizes and closes the scoresheet. Once finalized, it becomes read-only.

### Endpoint

```
POST /api/sportmanager.indoorvolleyball/api\scoresheet/finalize
```

### Request

Content-Type: `application/x-www-form-urlencoded`

| Parameter                                      | Type    | Description                              |
| ---------------------------------------------- | ------- | ---------------------------------------- |
| scoresheet[\_\_identity]                       | UUID    | The scoresheet identifier                |
| scoresheet[game][\_\_identity]                 | UUID    | The game identifier                      |
| scoresheet[isSimpleScoresheet]                 | boolean | Whether using simplified scoresheet      |
| scoresheet[writerPerson][\_\_identity]         | UUID    | Person who filled out the scoresheet     |
| scoresheet[file][\_\_identity]                 | UUID    | **Required** - Reference to uploaded PDF |
| scoresheet[hasFile]                            | boolean | Must be `true`                           |
| scoresheet[scoresheetValidation][\_\_identity] | UUID    | Validation record reference              |
| \_\_csrfToken                                  | string  | CSRF protection token                    |

### Prerequisites

Before finalization:

1. A PDF file must be uploaded and attached
1. Both team nomination lists must be finalized
1. Validation issues should be addressed (or will be flagged)

### Response

Returns the finalized scoresheet with `closedAt` and `closedBy` populated.

```json
{
  "__identity": "<scoresheet-uuid>",
  "game": {
    "__identity": "<game-uuid>"
  },
  "isSimpleScoresheet": false,
  "writerPerson": {
    "__identity": "<person-uuid>",
    "displayName": "[Referee Name]"
  },
  "file": {
    "__identity": "<file-resource-uuid>",
    "publicResourceUri": "https://volleymanager.volleyball.ch/_Resources/Persistent/<hash>/scoresheet.pdf"
  },
  "hasFile": true,
  "closedAt": "2025-12-10T20:52:45.000000+00:00",
  "closedBy": "referee",
  "scoresheetValidation": {
    "__identity": "<validation-uuid>",
    "hasValidationIssues": false
  },
  "_permissions": {
    "object": { "create": false, "update": false, "delete": false },
    "properties": { ... }
  }
}
```

---

## Game Details with Scoresheet Info

When accessing the eScoresheet, the game details are loaded with additional scoresheet-specific properties.

### Endpoint

```
GET /api/sportmanager.indoorvolleyball/api\game/showWithNestedObjects
```

### Additional Property Render Configuration for eScoresheet

| Property Path                                                                                                                                                                      | Description                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| scoresheet.writerPerson.\*                                                                                                                                                         | Scoresheet writer details         |
| scoresheet.file.persistentResource                                                                                                                                                 | Attached PDF file info            |
| scoresheet.file.publicResourceUri                                                                                                                                                  | Public URL to the PDF             |
| scoresheet.closedAt                                                                                                                                                                | When scoresheet was finalized     |
| scoresheet.game.startingDateTime                                                                                                                                                   | Game start time                   |
| scoresheet.scoresheetValidation.scoresheetValidationIssues.\*.validationIssueConfiguration.hideForUserContexts                                                                     | Which contexts hide this issue    |
| scoresheet.notFoundButNominatedPersons.\*.birthday                                                                                                                                 | Birthdates of unmatched persons   |
| scoresheet.notFoundButNominatedPersons.\*.relatedPerson                                                                                                                            | Potentially matching persons      |
| scoresheet.emergencySubstituteReferees.\*.person.birthday                                                                                                                          | Emergency referee birthdates      |
| nominationListOfTeamHome/Away.\*                                                                                                                                                   | Team nomination lists             |
| nominationListOfTeamHome/Away.game.startingDateTime                                                                                                                                | Game start time                   |
| nominationListOfTeamHome/Away.game.encounter.teamHomeDisplayName                                                                                                                   | Team display names                |
| nominationListOfTeamHome/Away.game.group.isTournamentGroup                                                                                                                         | Whether tournament group          |
| nominationListOfTeamHome/Away.team                                                                                                                                                 | Team reference                    |
| nominationListOfTeamHome/Away.closedAt                                                                                                                                             | When nomination list was closed   |
| nominationListOfTeamHome/Away.coachPerson.\*                                                                                                                                       | Head coach details                |
| nominationListOfTeamHome/Away.firstAssistantCoachPerson.\*                                                                                                                         | First assistant coach details     |
| nominationListOfTeamHome/Away.secondAssistantCoachPerson.\*                                                                                                                        | Second assistant coach details    |
| nominationListOfTeamHome/Away.indoorPlayerNominations.\*.indoorPlayer.person.birthday                                                                                              | Player birthdates                 |
| nominationListOfTeamHome/Away.indoorPlayerNominations.\*.indoorPlayerLicenseCategory.shortName                                                                                     | License categories                |
| nominationListOfTeamHome/Away.indoorPlayerNominations._.indoorPlayerNominationValidation.indoorPlayerNominationValidationIssues._.validationIssueConfiguration.hideForUserContexts | Validation issue visibility       |
| nominationListOfTeamHome/Away.indoorPlayerNominations.\*.indoorPlayerNominationValidation.gameOfOtherNominationOnSameDay                                                           | Other game on same day            |
| nominationListOfTeamHome/Away.nominationListValidation.nominationListValidationIssues.\*.validationIssueConfiguration.hideForUserContexts                                          | List validation visibility        |
| nominationListOfTeamHome/Away.notFoundButNominatedPersons.\*.birthday                                                                                                              | Unmatched person birthdates       |
| nominationListOfTeamHome/Away.notFoundButNominatedPersons.\*.relatedPerson                                                                                                         | Potentially matching persons      |
| group.phase.league.leagueCategory.writersCanUseSimpleScoresheetForThisLeagueCategory                                                                                               | Whether simple scoresheet allowed |
| group.phase.league.leagueCategory.managingAssociation                                                                                                                              | Managing association              |

---

## Notes

- The scoresheet is automatically created when first accessing the eScoresheet interface
- `isSimpleScoresheet` can only be `true` for lower league categories where it's allowed
- The `writerPerson` is typically the referee accessing the scoresheet
- Emergency substitute referees can be added if the assigned referee couldn't attend
- Once finalized, the scoresheet cannot be modified (permissions become read-only)
