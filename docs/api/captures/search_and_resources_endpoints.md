# Search and Resources Endpoints

These endpoints support search functionality and file management across the VolleyManager platform.

---

## Person Search (Elasticsearch)

Searches for persons by association ID, name, or year of birth using Elasticsearch for fast fuzzy matching.

### Endpoint

```
GET /api/sportmanager.core/api\elasticsearchperson/search
```

### Query Parameters

| Parameter                                             | Type    | Description                                   |
| ----------------------------------------------------- | ------- | --------------------------------------------- |
| searchConfiguration[propertyFilters][0][propertyName] | string  | First filter property (e.g., "associationId") |
| searchConfiguration[propertyFilters][0][text]         | string  | Search text for first filter                  |
| searchConfiguration[propertyFilters][1][propertyName] | string  | Second filter property (e.g., "firstName")    |
| searchConfiguration[propertyFilters][1][text]         | string  | Search text for second filter                 |
| searchConfiguration[propertyFilters][2][propertyName] | string  | Third filter property (e.g., "lastName")      |
| searchConfiguration[propertyFilters][2][text]         | string  | Search text for third filter                  |
| searchConfiguration[propertyFilters][3][propertyName] | string  | Fourth filter property (e.g., "yearOfBirth")  |
| searchConfiguration[propertyFilters][3][text]         | string  | Search text for fourth filter                 |
| searchConfiguration[offset]                           | integer | Pagination offset (default: 0)                |
| searchConfiguration[limit]                            | integer | Results per page (default: 50)                |
| propertyRenderConfiguration[]                         | array   | Properties to include in response             |

### Example Request

```
GET /api/sportmanager.core/api\elasticsearchperson/search
  ?searchConfiguration[propertyFilters][0][propertyName]=associationId
  &searchConfiguration[propertyFilters][0][text]=dupont
  &searchConfiguration[propertyFilters][1][propertyName]=firstName
  &searchConfiguration[propertyFilters][1][text]=dupont
  &searchConfiguration[propertyFilters][2][propertyName]=lastName
  &searchConfiguration[propertyFilters][2][text]=dupont
  &searchConfiguration[propertyFilters][3][propertyName]=yearOfBirth
  &searchConfiguration[propertyFilters][3][text]=dupont
  &searchConfiguration[offset]=0
  &searchConfiguration[limit]=50
  &propertyRenderConfiguration[0]=birthday
```

### How Search Works

The same search text is applied to multiple fields (OR logic):

- Association ID (Swiss Volley member number)
- First name
- Last name
- Year of birth

This allows users to search by typing a name, ID, or birth year and get matching results.

### Response

```json
{
  "items": [
    {
      "__identity": "<person-uuid>",
      "firstName": "[First Name]",
      "lastName": "[Last Name]",
      "displayName": "[Full Name]",
      "associationId": 12345,
      "birthday": "1990-05-15T00:00:00.000000+00:00",
      "gender": "m",
      "_permissions": {
        "properties": {
          "gender": { "create": true, "read": true, "update": false, "required": false },
          "birthday": { "create": true, "read": true, "update": false, "required": false },
          "nationality": { "create": true, "read": true, "update": false, "required": false }
        }
      }
    },
    {
      "__identity": "<person-uuid>",
      "firstName": "[First Name]",
      "lastName": "[Last Name]",
      "displayName": "[Full Name]",
      "associationId": 67890,
      "birthday": "1985-11-22T00:00:00.000000+00:00",
      "gender": "f",
      "_permissions": { ... }
    }
  ],
  "totalItemsCount": 15
}
```

### Usage

Used for autocomplete in:

- Adding emergency substitute referees to scoresheets
- Finding coaches for nomination lists
- General person lookup

---

## File Upload

Uploads files (typically scoresheet PDFs) to the server.

### Endpoint

```
POST /api/sportmanager.resourcemanagement/api\persistentresource/upload
```

### Request

Content-Type: `multipart/form-data`

| Parameter          | Type   | Description           |
| ------------------ | ------ | --------------------- |
| scoresheetFile[]   | file   | The file to upload    |
| \_\_csrfToken      | string | CSRF protection token |

### Example (using cURL)

```bash
curl -X POST \
  'https://volleymanager.volleyball.ch/api/sportmanager.resourcemanagement/api\persistentresource/upload' \
  -H 'Cookie: Neos_Flow_Session=<session-id>' \
  -F 'scoresheetFile[]=@/path/to/scoresheet.pdf' \
  -F '__csrfToken=<csrf-token>'
```

### Response

Returns an array with the uploaded file resource(s).

```json
[
  {
    "__identity": "<file-resource-uuid>",
    "persistentResource": {
      "__identity": "<persistent-resource-uuid>",
      "filename": "scoresheet.pdf",
      "mediaType": "application/pdf",
      "fileSize": 245678,
      "sha1": "<file-hash>"
    },
    "publicResourceUri": "https://volleymanager.volleyball.ch/_Resources/Persistent/<hash>/scoresheet.pdf",
    "createdAt": "2025-12-10T20:52:14.000000+00:00",
    "createdBy": "[username]",
    "createdByIpAddress": "[ip-address]",
    "createdByPersistenceIdentifier": "<user-uuid>",
    "updatedAt": "2025-12-10T20:52:14.000000+00:00",
    "updatedBy": "[username]",
    "_permissions": {
      "object": { "create": true, "read": true, "update": true, "delete": true },
      "properties": {
        "persistentResource": { "create": true, "read": true, "update": true, "required": false },
        "publicResourceUri": { "create": true, "read": true, "update": true, "required": false }
      }
    }
  }
]
```

### File Resource Properties

| Property           | Description                                   |
| ------------------ | --------------------------------------------- |
| \_\_identity       | UUID to reference this file in other entities |
| persistentResource | Internal resource details                     |
| publicResourceUri  | Public URL to access the file                 |
| filename           | Original filename                             |
| mediaType          | MIME type                                     |
| fileSize           | Size in bytes                                 |

### After Upload

The returned `__identity` is used to attach the file to other entities:

```
scoresheet[file][__identity]=<file-resource-uuid>
```

---

## Filter Settings

Retrieves saved filter settings for data tables.

### Endpoint

```
GET /api/sportmanager.core/api\filtersettings/listFilterSettingsForCurrentList
```

### Query Parameters

| Parameter   | Type   | Description               |
| ----------- | ------ | ------------------------- |
| dataTableId | string | The data table identifier |

### Common Data Table IDs

| ID                                                           | Used For                           |
| ------------------------------------------------------------ | ---------------------------------- |
| editNominationList.indoorPlayerNominations                   | Current player nominations in list |
| editNominationList.indoorPlayerNominationWhichCanBeAddedList | Available players to add           |

### Example Request

```
GET /api/sportmanager.core/api\filtersettings/listFilterSettingsForCurrentList
  ?dataTableId=editNominationList.indoorPlayerNominations
```

### Response

```json
[
  {
    "__identity": "<filter-setting-uuid>",
    "dataTableId": "editNominationList.indoorPlayerNominations",
    "filterConfiguration": {
      "columns": ["shirtNumber", "displayName", "licenseCategory"],
      "sortBy": "shirtNumber",
      "sortDirection": "asc"
    },
    "isDefault": true
  }
]
```

### Usage

Used to restore user's preferred:

- Column visibility
- Sort order
- Filter presets

---

## Notes

### Search Performance

- Elasticsearch provides sub-second search across large datasets
- Results are ranked by relevance
- Partial matches are supported (fuzzy search)

### File Storage

- Files are stored in Neos Flow's persistent resource storage
- Public URIs are generated for authorized access
- Files are linked to entities via UUID references
- The same file can be referenced by multiple entities

### CSRF Protection

All write operations require a valid `__csrfToken`:

- Obtained from any authenticated page/response
- Must be included in POST/PUT requests
- Token is session-specific
