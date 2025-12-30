# Profile Page Endpoints

When navigating to "Mon profil" (My Profile), multiple API calls are made to load user data.

## Page URL

```
/sportmanager.volleyball/myprofile
```

## Profile Tabs

1. **Données personnelles** - Personal data (default)
1. **Données de contact** - Contact data
1. **Compte d'utilisateur** - User account
1. **Coordonnées bancaires** - Bank details
1. **Protection des données** - Data protection
1. **Mentions légales/Conditions** - Legal notices/Terms
1. **Données ARB** - Referee data (ARB = Arbitre)

______________________________________________________________________

## API Calls on Profile Load

### 1. Get Person with Permissions

Retrieves the person data with their permissions.

```
GET /api/sportmanager.volleyball/api\person/showWithNestedObjects
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| person[\_\_identity] | UUID | The person identifier |
| propertyRenderConfiguration[0] | string | "\_permissions" |

**Example:**

```
GET ...person/showWithNestedObjects
  ?propertyRenderConfiguration[0]=_permissions
  &person[__identity]=<person-uuid>
```

**Response Structure:**

```json
{
  "person": {
    "__identity": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "persistenceObjectIdentifier": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "svNumber": 12345,
    "associationId": 12345,
    "externalId": "12345",
    "firstName": "Jean",
    "lastName": "Dupont",
    "displayName": "Jean Dupont",
    "fullName": "Jean Dupont",
    "gender": "m",
    "genderNoun": "Homme",
    "genderAdjective": "masculin",
    "birthday": "1989-08-07T22:00:00.000000+00:00",
    "formattedAndTimezoneIndependentBirthday": "1989-08-08",
    "yearOfBirth": 1989,
    "age": 36,
    "correspondenceLanguage": "fr",
    "accountActive": true,
    "hasAccount": true,
    "hasProfilePicture": true,
    "activeRoleIdentifier": "Indoorvolleyball.RefAdmin:Referee",
    "nationality": {
      "__identity": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "isoCode2": "CH",
      "isoCode3": "CHE",
      "translations": {
        "de": { "name": "Schweiz" },
        "fr": { "name": "Suisse" }
      }
    },
    "_permissions": {
      "properties": {
        "firstName": { "create": true, "read": true, "update": true },
        "lastName": { "create": true, "read": true, "update": true },
        "correspondenceLanguage": { "create": true, "read": true, "update": true }
      },
      "object": { "create": true, "update": true, "delete": false }
    },
    "createdAt": "2020-01-15T10:30:00.000000+00:00",
    "updatedAt": "2024-06-20T14:45:00.000000+00:00"
  }
}
```

______________________________________________________________________

### 2. Get Indoor Referee by Active Person

Retrieves referee-specific data for the logged-in person.

```
GET /api/indoorvolleyball.refadmin/api\indoorreferee/getIndoorRefereeByActivePerson
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| person | UUID | The person identifier |

**Example:**

```
GET ...getIndoorRefereeByActivePerson?person=<person-uuid>
```

**Response Structure:**

```json
{
  "__identity": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "persistenceObjectIdentifier": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "person": {
    "__identity": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "firstName": "Jean",
    "lastName": "Dupont",
    "displayName": "Jean Dupont"
  },
  "refereeLevel": {
    "__identity": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "name": "National A",
    "shortName": "NA"
  },
  "refereeNumber": 12345,
  "jerseyNumber": null,
  "refereeInformation": "Jean Dupont (12345, 1989-08-08, )",
  "refereeSinceDate": "2015-09-01",
  "validated": true,
  "isInternationalReferee": false,
  "hasLinesmanCertification": true,
  "hasNotes": false,
  "transportationMode": "car",
  "mobilePhoneNumbers": "+41 79 123 45 67",
  "fixnetPhoneNumbers": "",
  "privatePostalAddresses": "Rue Example 1, 1000 Lausanne",
  "managingAssociation": {
    "__identity": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "name": "Association Vaudoise de Volleyball",
    "shortName": "AVV"
  },
  "_permissions": {
    "properties": {
      "transportationMode": { "create": true, "read": true, "update": true },
      "notes": { "create": true, "read": true, "update": true }
    },
    "object": { "create": true, "update": true, "delete": false }
  },
  "createdAt": "2015-09-01T08:00:00.000000+00:00",
  "updatedAt": "2024-08-15T16:30:00.000000+00:00",
  "createdBy": "system",
  "updatedBy": "Jean Dupont"
}
```

______________________________________________________________________

### 3. Get Country List

Retrieves the list of countries (for nationality dropdown).

```
GET /api/sportmanager.core/api\country
```

**No parameters required.**

______________________________________________________________________

### 4. Check Referee Data Management Permission

Checks if the active user is allowed to manage referee data.

```
GET /api/indoorvolleyball.refadmin/api\refereeassociationsettings/isRefereeDataManagementAllowedForActiveParty
```

**No parameters required.**

______________________________________________________________________

### 5. Get Indoor Association Referee of Active Party

Gets the association referee record for the current user.

```
GET /api/indoorvolleyball.refadmin/api\indoorassociationreferee/getIndoorAssociationRefereeOfActiveParty
```

**No parameters required.**

______________________________________________________________________

### 6. Get Seasonal Referee Data

Retrieves seasonal referee data for the current season.

```
POST /api/indoorvolleyball.refadmin/api\indoorassociationrefereeseasonalrefereedata/getForIndoorAssociationRefereeForCurrentSeason
```

**Request format:** Form-encoded with CSRF token

______________________________________________________________________

### 7. Get Referee Mandates by Managing Association

Retrieves referee mandates for a specific association.

```
GET /api/indoorvolleyball.refadmin/api\refereemandate/getRefereeMandatesByManagingAssociation
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| managingAssociation | UUID | The managing association identifier |

**Example:**

```
GET ...getRefereeMandatesByManagingAssociation?managingAssociation=<association-uuid>
```

______________________________________________________________________

## Personal Data Tab Fields

| Field (FR) | Field (EN) | Editable | Example |
|------------|------------|----------|---------|
| Numéro SV | SV Number | No | 12345 |
| Genre | Gender | No | masculin |
| Prénom | First name | Yes | Jean |
| Nom | Last name | Yes | Dupont |
| Date de naissance | Birth date | No | 01.01.1990 |
| Nationalité | Nationality | No | Suisse |
| Langue de correspondance | Correspondence language | Yes | fr |

______________________________________________________________________

## Profile Picture

Profile pictures are stored at:

```
/_Resources/Persistent/<hash>/<svNumber>_<firstName>_<lastName>.jpg
```

**Example:**

```
/_Resources/Persistent/<content-hash>/<sv_number>_<first_name>_<last_name>.jpg
```

Actions available:

- **add_photo_alternate** - Upload new photo
- **delete** - Delete current photo

______________________________________________________________________

## Notes

- Some fields are read-only and require contacting Swiss Volley to modify
- The person UUID is different from the SV number (which is a display ID)
- Profile data is loaded in parallel with referee-specific data
