# Referee Convocation Info Endpoint

When clicking "Informations de convocation" from the Assignments tab, a new endpoint is called.

## Endpoint

```
GET /api/indoorvolleyball.refadmin/api\refereeconvocation/showWithNestedObjects
```

## Query Parameters

| Parameter                        | Type  | Description                       |
| -------------------------------- | ----- | --------------------------------- |
| refereeConvocation[\_\_identity] | UUID  | The convocation identifier        |
| propertyRenderConfiguration[]    | Array | List of property paths to include |

## Property Render Configuration

The dialog requests these properties:

### Referee Contact Info (for each position)

For each position (FirstHeadReferee, SecondHeadReferee, FirstLinesman, SecondLinesman, ThirdLinesman, FourthLinesman, StandbyHeadReferee, StandbyLinesman):

- `refereeGame.activeRefereeConvocation{Position}.indoorAssociationReferee.indoorReferee.person.primaryPostalAddress`
- `refereeGame.activeRefereeConvocation{Position}.indoorAssociationReferee.indoorReferee.person.primaryEmailAddress`
- `refereeGame.activeRefereeConvocation{Position}.indoorAssociationReferee.indoorReferee.person.primaryPhoneNumber`

### Referee Dispatcher (Convocateur)

- `refereeSelectionBy.primaryEmailAddress`
- `refereeSelectionBy.primaryPhoneNumber`

### Other Data

- `refereeMatchingStatistic`
- `referee.person.primaryPostalAddress.geographicalLocation`
- `refereeGame.game.hall.primaryPostalAddress.geographicalLocation`
- `refereeGame.game.startingDateTime`
- `refereeGame.game.encounter.teamHome`
- `refereeGame.game.encounter.teamAway`
- `refereeGame.game.group.phase.league.leagueCategory`

## Example Request

```
GET /api/indoorvolleyball.refadmin/api\refereeconvocation/showWithNestedObjects
  ?refereeConvocation[__identity]=<convocation-uuid>
  &propertyRenderConfiguration[0]=refereeGame.activeRefereeConvocationFirstHeadReferee.indoorAssociationReferee.indoorReferee.person.primaryPostalAddress
  &propertyRenderConfiguration[1]=refereeGame.activeRefereeConvocationFirstHeadReferee.indoorAssociationReferee.indoorReferee.person.primaryEmailAddress
  &propertyRenderConfiguration[16]=refereeGame.activeRefereeConvocationFirstHeadReferee.indoorAssociationReferee.indoorReferee.person.primaryPhoneNumber
  ... (more properties)
  &propertyRenderConfiguration[24]=refereeSelectionBy.primaryEmailAddress
  &propertyRenderConfiguration[25]=refereeSelectionBy.primaryPhoneNumber
  &propertyRenderConfiguration[26]=refereeMatchingStatistic
  ...
```

## Dialog Content

The "Informations de convocation" dialog shows:

### Match Information (Informations du match)

| Field                | Example                              |
| -------------------- | ------------------------------------ | ------------------------- | -------------------------------------- |
| N° match             | #382417                              |
| Catégorie de ligue   | SVRZ                                 | 3L                        |
| Ligue                | #6652                                | 3L                        | ♂                                      |
| Genre                | ♂                                    |
| Phase                | #13012                               | Hin- und Rückrunde        |
| Groupe               | #27108                               | Herren 3. Liga Gruppe B   |
| Jour de match        | 6                                    |
| Date/heure           | 08.12.2025 20:30                     |
| Salle                | #2146                                | [Hall Name]               | [Street Address], [Postal Code] [City] |
| Plus code            | [Plus Code]                          |
| Equipe recevante     | #3926                                | [Team Name] (3L, ♂, SVRZ) |
| Responsable d'équipe | [Contact Name]                       | [email@example.com]       |
| Equipe visiteuse     | #85                                  | [Team Name] (3L, ♂, SVRZ) |
| Responsable d'équipe | Multiple contacts with email & phone |
| Arbitres             | ARB 1, ARB 2 with contact info       |

### Referee Dispatcher (Convocateur des arbitres)

| Field     | Example                |
| --------- | ---------------------- |
| Nom       | [Dispatcher Name]      |
| Téléphone | +41 XX XXX XX XX       |
| E-mail    | dispatcher@example.com |

### Assigned Referees (Arbitres convoqués)

| Position | Details      |
| -------- | ------------ | -------------- | -------------------- | ----- | ----- |
| ARB 1    | #[SV Number] | [Referee Name] | [Postal Code] [City] | phone | email |
| ARB 2    | #[SV Number] | [Referee Name] | [Postal Code] [City] | phone | email |

## Difference from Exchange Match Details

The "Informations de convocation" dialog shows MORE info than the exchange "Détails du match":

- **Referee dispatcher contact info** (convocateur)
- **Referee postal addresses** (city/postal code)
- **Referee association IDs** (#[SV Number])

This is because it uses `refereeconvocation/showWithNestedObjects` instead of just `game/showWithNestedObjects`.

## Combined API Calls

The full dialog makes 3 parallel API calls:

1. `refereeconvocation/showWithNestedObjects` - Referee-specific data with dispatcher info
1. `game/getTeamContactInfosByGame` - Team manager contacts
1. `game/getRefereeGameByGame` - Referee assignments
