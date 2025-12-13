# Role/Party Selection Mechanism

When clicking on the user profile button in the header (showing "[User Name] - Arbitre: [Association]"), a dropdown menu appears with available roles.

## Menu Trigger

The role selection is triggered by clicking the profile button in the top navigation:

```
button "profilePicture [User Name] Arbitre: [Association]"
```

## Available Roles/Parties

The menu shows all roles/parties available to the logged-in user:

| Role | Description |
|------|-------------|
| Arbitre: SV | Swiss Volley national referee |
| Arbitre: SVRBA | Regional association referee (Bern-Aargau) |
| Arbitre: SVRZ | Regional association referee (Zurich) |
| Joueur de volleyball | Volleyball player role |

## Technical Implementation

### No API Call on Menu Open

Opening the role selection menu does **NOT** trigger any API calls. The available roles are pre-loaded with the initial page/session data.

### Role Switching Mechanism

When clicking a different role, the app navigates to the same page with a different "party" context. This appears to be handled through:

1. Page reload/navigation
1. Server-side party/context switch via session

### Navigation Structure per Role

Each role provides different navigation options. For "RefAdmin" (referee) role:

```
Mes données d'arbitre (My referee data)
├── Donnés saisonnières (/indoorvolleyball.refadmin/seasonalrefereedatacontainerforreferee/index)
└── Absences (/indoorvolleyball.refadmin/refereeabsence/administrate)

Convocation arbitres (Referee assignments)
├── Mes convocations (/indoorvolleyball.refadmin/refereeconvocation/index)
├── Mes indemnités (/indoorvolleyball.refadmin/refereeconvocationcompensation/index)
└── Bourse arbitrages (/indoorvolleyball.refadmin/refereegameexchange/index)

Services
└── Abonnement calendrier des matchs (/sportmanager.indoorvolleyball/icalhashgamepropertyfiltersettings/index)
```

## Role Display Format

Roles are displayed with:

- Profile picture
- Role type: Association abbreviation (e.g., "Arbitre: SVRZ")

## Notes

- The user can have multiple roles across different associations
- Each regional association (SVRBA, SVRZ) is a separate party
- The "SV" role represents Swiss Volley national level
- "Joueur de volleyball" is a player role (not referee)
- Role switching likely changes the API responses based on the active party context
