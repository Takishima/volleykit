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

Opening the role selection menu does **NOT** trigger any API calls. The available roles are pre-loaded with the initial page/session data (via `activeParty.groupedEligibleAttributeValues`).

### Role Switching API Call

When clicking a different role, the app makes a `PUT` request to switch the active party:

**Endpoint:**
```
PUT /api/sportmanager.security/api\party/switchRoleAndAttribute
```

**Important:** The URL path requires the `/api/` prefix. This is different from other `/sportmanager.security/` endpoints (like authentication) which do NOT have the `/api/` prefix.

**Request Headers:**
```
Content-Type: text/plain;charset=UTF-8
```

Note: The `Content-Type` is `text/plain`, NOT `application/x-www-form-urlencoded`, even though the body is URL-encoded. The real site also sends a `window-unique-id` header, but it appears to be optional.

**Request Body (URL-encoded):**
```
attributeValueAsArray[0]=<occupation-uuid>&__csrfToken=<csrf-token>
```

| Parameter | Description |
|-----------|-------------|
| `attributeValueAsArray[0]` | The `__identity` UUID of the AttributeValue (occupation) to switch to |
| `__csrfToken` | CSRF token from the session |

**Response:**
- `200 OK` - Successfully switched (empty response or JSON)
- `500 Internal Server Error` - Switch failed (often due to wrong URL path or Content-Type)

**After switching:**
The page reloads to apply the new party context. All subsequent API calls will return data for the newly selected association.

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
- Role switching changes the API responses based on the active party context
- The occupation UUID comes from `groupedEligibleAttributeValues[].\_\_identity`
