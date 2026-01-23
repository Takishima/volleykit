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

---

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

---

### 2. Get Indoor Referee by Active Person

Retrieves referee-specific data for the logged-in person, including payment connections, certifications, and contact information.

```
GET /api/indoorvolleyball.refadmin/api\indoorreferee/getIndoorRefereeByActivePerson
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| person | UUID | The person identifier |

**Example:**

```
GET ...getIndoorRefereeByActivePerson?person=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```

**Response Headers:**

```
access-control-allow-headers: Authorization,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range
access-control-allow-methods: GET, PUT, POST, DELETE, OPTIONS
access-control-allow-origin: *
content-type: application/json
x-flow-powered: Flow/5.3
x-powered-by: PHP/7.4.33
```

**Response Structure (Full):**

```json
{
  "__identity": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "persistenceObjectIdentifier": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "_permissions": {
    "object": { "create": true, "read": true, "update": true, "delete": true },
    "properties": {
      "refereeSinceDate": { "create": true, "read": true, "update": true, "required": false },
      "jerseyNumber": { "create": true, "read": true, "update": true, "required": false },
      "person": { "create": true, "read": true, "update": true, "required": false },
      "currentLicense": { "create": true, "read": true, "update": true, "required": false },
      "licenses": { "create": true, "read": true, "update": true, "required": false },
      "refereeInformation": { "create": true, "read": true, "update": true, "required": false },
      "refereeCategoryTypes": { "create": true, "read": true, "update": true, "required": false },
      "teamBan": { "create": true, "read": true, "update": true, "required": false },
      "clubBan": { "create": true, "read": true, "update": true, "required": false },
      "transportationMode": { "create": true, "read": true, "update": true, "required": false },
      "validated": { "create": true, "read": true, "update": true, "required": false },
      "hasPlusCode": { "create": true, "read": true, "update": true, "required": false },
      "otherRefereeConvocationOnSameDay": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "refereeMutationStatus": { "create": true, "read": true, "update": true, "required": false },
      "communicationAssociation": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "primaryPaymentConnection": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "paymentConnections": { "create": true, "read": true, "update": true, "required": false },
      "indoorAssociationReferees": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "isInternationalReferee": { "create": true, "read": true, "update": true, "required": false },
      "activeSeasonalRefereeData": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "seasonalRefereeDataCollection": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "numberOfPastActiveRefereeSeasonsUntil2022": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "dateOfFirstRefereeCertification": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "dateOfFirstInternationalRefereeCertification": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "linesmanCertifications": { "create": true, "read": true, "update": true, "required": false },
      "refereeCertifications": { "create": true, "read": true, "update": true, "required": false },
      "hasNotes": { "create": true, "read": true, "update": true, "required": false },
      "hasSubmittedCollectionForm": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "createdAt": { "create": true, "read": true, "update": true, "required": false },
      "createdBy": { "create": true, "read": true, "update": true, "required": false },
      "createdByPersistenceIdentifier": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "createdByIpAddress": { "create": true, "read": true, "update": true, "required": false },
      "updatedAt": { "create": true, "read": true, "update": true, "required": false },
      "updatedBy": { "create": true, "read": true, "update": true, "required": false },
      "updatedByPersistenceIdentifier": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "updatedByIpAddress": { "create": true, "read": true, "update": true, "required": false },
      "covid19CertificateAvailability": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "covid19CertificateValidUntil": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "lastCovid19VaccinationDate": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "willingToGetTestedForCovid19Until": {
        "create": true,
        "read": true,
        "update": true,
        "required": false
      },
      "notes": { "create": true, "read": true, "update": true, "required": false }
    }
  },
  "businessPostalAddresses": "",
  "communicationAssociation": null,
  "covid19CertificateAvailability": "-",
  "covid19CertificateValidUntil": null,
  "createdAt": "2022-05-23T18:12:05.000000+00:00",
  "createdBy": "System",
  "createdByIpAddress": "",
  "createdByPersistenceIdentifier": "System",
  "dateOfFirstInternationalRefereeCertification": null,
  "dateOfFirstRefereeCertification": "2015-09-15T22:00:00.000000+00:00",
  "fixnetPhoneNumbers": "",
  "hasLinesmanCertification": true,
  "hasNotes": false,
  "hasPlusCode": true,
  "hasSubmittedCollectionForm": false,
  "isInternationalReferee": false,
  "jerseyNumber": null,
  "lastCovid19VaccinationDate": null,
  "lastUpdatedByRealUser": true,
  "managingAssociation": null,
  "mobilePhoneNumbers": "+41 79 123 45 67",
  "numberOfPastActiveRefereeSeasonsUntil2022": 7,
  "otherRefereeConvocationOnSameDay": false,
  "paymentConnections": [
    {
      "__identity": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "createdBy": "jean_dupont",
      "createdByIpAddress": null,
      "createdByPersistenceIdentifier": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "financialInstitutionName": null,
      "iban": "CH00 0000 0000 0000 0000 0",
      "isPrimaryPaymentConnection": true,
      "lastUpdatedByRealUser": true,
      "name": null,
      "payee": "Jean Dupont",
      "payeePostalAddress": {
        "__identity": "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "additionToAddress": "",
        "asMultilineText": "Rue Example 1<br />1000 Lausanne<br />Suisse",
        "city": "Lausanne",
        "combinedAddress": "Rue Example 1",
        "country": {
          "__identity": "11111111-1111-1111-1111-111111111111",
          "countryCode": "CH",
          "countryFlag": "<svg>...</svg>",
          "countryName": "Suisse",
          "fifaCode": "SUI",
          "fipsCode": "SZ",
          "geonameId": 2658434,
          "iocCode": "SUI",
          "isoAlpha3": "CHE",
          "isoNumeric": 756,
          "translations": {
            "de": { "countryName": "Schweiz" },
            "en": { "countryName": "Switzerland" },
            "fr": { "countryName": "Suisse" },
            "it": { "countryName": "Svizzera" }
          }
        },
        "countrySubdivision": {
          "__identity": "22222222-2222-2222-2222-222222222222",
          "adminCode1": "VD",
          "adminName1": "Vaud",
          "geonameId": 2658182,
          "lat": 46.5,
          "lng": 6.5,
          "toponymName": "Canton de Vaud",
          "translations": {
            "de": { "adminName1": "Waadt", "toponymName": "Kanton Waadt" },
            "en": { "adminName1": "Vaud", "toponymName": "Canton of Vaud" },
            "fr": { "adminName1": "Vaud", "toponymName": "Canton de Vaud" },
            "it": { "adminName1": "Vaud", "toponymName": "Canton Vaud" }
          }
        },
        "geographicalLocation": {
          "__identity": "33333333-3333-3333-3333-333333333333",
          "latitude": 46.5196535,
          "longitude": 6.6322734,
          "plusCode": "8FR26M2X+XX",
          "usageType": 1,
          "validated": false,
          "validationStatus": "unknown"
        },
        "houseNumber": "1",
        "isPrimary": true,
        "postalCode": "1000",
        "postalCodeAndCity": "1000 Lausanne",
        "street": "Rue Example",
        "streetAndHouseNumber": "Rue Example 1",
        "type": "address_only",
        "usageType": 2,
        "validated": false
      },
      "type": "bank",
      "updatedBy": "jean_dupont",
      "updatedByIpAddress": "192.168.1.1",
      "updatedByPersistenceIdentifier": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
    }
  ],
  "privatePostalAddresses": "Rue Example 1, 1000 Lausanne",
  "refereeInformation": "Dupont Jean (12345, 1989-08-08, )",
  "refereeMutationStatus": null,
  "refereeSinceDate": null,
  "showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses": true,
  "transportationMode": "car",
  "updatedAt": "2025-09-25T07:53:15.000000+00:00",
  "updatedBy": "admin_user",
  "updatedByIpAddress": "192.168.1.2",
  "updatedByPersistenceIdentifier": "44444444-4444-4444-4444-444444444444",
  "validated": true,
  "willingToGetTestedForCovid19Until": null
}
```

**Key Response Fields:**

| Field                                                        | Type     | Description                              |
| ------------------------------------------------------------ | -------- | ---------------------------------------- |
| `refereeInformation`                                         | string   | Formatted string: "Name (SV#, DOB, )"    |
| `transportationMode`                                         | string   | "car", "train", "public_transport", etc. |
| `validated`                                                  | boolean  | Whether referee profile is validated     |
| `isInternationalReferee`                                     | boolean  | International referee status             |
| `hasLinesmanCertification`                                   | boolean  | Linesman certification status            |
| `hasPlusCode`                                                | boolean  | Whether address has Plus Code geocoding  |
| `paymentConnections`                                         | array    | Bank accounts for compensation payments  |
| `mobilePhoneNumbers`                                         | string   | Formatted phone number                   |
| `privatePostalAddresses`                                     | string   | Formatted address                        |
| `showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses` | boolean  | TWINT visibility setting                 |
| `dateOfFirstRefereeCertification`                            | datetime | ISO 8601 timestamp                       |

**Payment Connection Structure:**

Each payment connection includes:

- `iban`: Bank account IBAN (formatted with spaces)
- `payee`: Name on account
- `isPrimaryPaymentConnection`: Primary account flag
- `payeePostalAddress`: Full address with geocoding
- `type`: "bank" or "postal"

---

### 3. Get Country List

Retrieves the list of countries (for nationality dropdown).

```
GET /api/sportmanager.core/api\country
```

**No parameters required.**

---

### 4. Check Referee Data Management Permission

Checks if the active user is allowed to manage referee data.

```
GET /api/indoorvolleyball.refadmin/api\refereeassociationsettings/isRefereeDataManagementAllowedForActiveParty
```

**No parameters required.**

---

### 5. Get Indoor Association Referee of Active Party

Gets the association referee record for the current user.

```
GET /api/indoorvolleyball.refadmin/api\indoorassociationreferee/getIndoorAssociationRefereeOfActiveParty
```

**No parameters required.**

---

### 6. Get Seasonal Referee Data

Retrieves seasonal referee data for the current season.

```
POST /api/indoorvolleyball.refadmin/api\indoorassociationrefereeseasonalrefereedata/getForIndoorAssociationRefereeForCurrentSeason
```

**Request format:** Form-encoded with CSRF token

---

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

---

## Personal Data Tab Fields

| Field (FR)               | Field (EN)              | Editable | Example    |
| ------------------------ | ----------------------- | -------- | ---------- |
| Numéro SV                | SV Number               | No       | 12345      |
| Genre                    | Gender                  | No       | masculin   |
| Prénom                   | First name              | Yes      | Jean       |
| Nom                      | Last name               | Yes      | Dupont     |
| Date de naissance        | Birth date              | No       | 01.01.1990 |
| Nationalité              | Nationality             | No       | Suisse     |
| Langue de correspondance | Correspondence language | Yes      | fr         |

---

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

---

## Notes

- Some fields are read-only and require contacting Swiss Volley to modify
- The person UUID is different from the SV number (which is a display ID)
- Profile data is loaded in parallel with referee-specific data
