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
