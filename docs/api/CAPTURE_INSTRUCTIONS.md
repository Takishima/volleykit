# How to Capture API Details

This guide explains how to capture the exact API request/response data from the browser to complete our OpenAPI specification.

## Prerequisites

1. Open the VolleyManager website in Chrome or Firefox
1. Log in as a referee
1. Open DevTools (F12)
1. Go to the **Network** tab
1. Enable **Preserve log** (so requests don't disappear on navigation)
1. Filter by **Fetch/XHR** to see only API calls

## For Each Endpoint

### Step 1: Trigger the Request

Navigate to the page or perform the action that triggers the API call. For example:

- Assignments: Go to "Mes convocations"
- Compensations: Go to "Indemnités d'arbitre"
- Exchanges: Go to "Bourse aux arbitrages"

### Step 2: Find the Request

In the Network tab, look for the POST/GET request to the endpoint. Click on it to open the details panel.

### Step 3: Copy Request Data

1. Click on the **Payload** or **Request** tab
1. Find the **Form Data** section (for POST requests)
1. Copy ALL parameters exactly as shown

**Paste into this file format:**

```yaml
# In volleymanager-openapi.yaml, update the requestBody schema

Example for Assignments:
  __csrfToken: "abc123..."
  searchConfiguration[dateRange][from]: "2025-12-08"
  searchConfiguration[dateRange][to]: "2026-05-20"
  searchConfiguration[dateProperty]: "refereeConvocation.refereeGame.game.startingDateTime"
  searchConfiguration[propertyOrderings][0][propertyName]: "refereeGame.game.startingDateTime"
  searchConfiguration[propertyOrderings][0][descending]: false
  searchConfiguration[propertyOrderings][0][isSetByUser]: true
  pagination[page]: "1"
  pagination[itemsPerPage]: "50"
```

### Step 4: Copy Response Data

1. Click on the **Response** tab
1. The JSON response should be displayed
1. Copy the ENTIRE response (use Copy button if available)

**Important:**

- Copy at least 2-3 complete items from the array to see all possible fields
- Note which fields can be `null`
- Look for nested objects and arrays

### Step 5: Update OpenAPI Spec

Open `volleymanager-openapi.yaml` and:

1. Find the schema definition (search for "TODO")
1. Replace with the actual structure from the response
1. Mark optional fields with `nullable: true` or not in `required` list
1. Add descriptions for unclear fields
1. Update the example response

## Example Workflow

### Capturing Assignments Endpoint

1. **Navigate:** Go to "Mes convocations" page
1. **Find Request:** Look for `POST searchMyRefereeConvocations` in Network tab
1. **Click Request:** Opens details panel
1. **Payload Tab:** Shows form data like:
   ```
   __csrfToken: xyz789
   searchConfiguration[dateRange][from]: 2025-12-08
   ...
   ```
1. **Copy to text file temporarily**
1. **Response Tab:** Shows JSON like:
   ```json
   {
     "items": [{
       "__identity": "...",
       "refereeGame": {
         ...
       }
     }],
     "pagination": {...}
   }
   ```
1. **Copy entire JSON**
1. **Update OpenAPI:** Replace the `Assignment` schema definition

## Tips

- **Pretty Print JSON:** Use an online JSON formatter if the response is minified
- **Compare Multiple Responses:** Load different data (different date ranges) to see variations
- **Note Edge Cases:** Empty arrays, null values, missing optional fields
- **Check Error Responses:** Try with expired session to capture 401/403 responses

## Using Browser Console for Copying

If right-click copy doesn't work:

```javascript
// In Console tab, after clicking a network request
copy(await (await fetch('/api/...')).text())
```

This copies the response to clipboard.

## What We Need for Each Endpoint

✅ = Captured, ❌ = Still needed

### Assignments (`searchMyRefereeConvocations`)

- ❌ Complete request parameters
- ❌ Complete response structure
- ❌ Field descriptions
- ❌ Error response examples

### Compensations (`search`)

- ❌ Complete request parameters
- ❌ Complete response structure
- ❌ Payment status field values
- ❌ Additional expense types

### Exchanges (`search`)

- ❌ Complete request parameters
- ❌ Complete response structure
- ❌ Status field values
- ❌ Referee level codes

### Settings Endpoints

- ❌ Active season response
- ❌ Association settings response

## Next Steps After Capture

Once we have complete data:

1. **Validate OpenAPI Spec**

   ```bash
   # Install validator
   npm install -g @apidevtools/swagger-cli

   # Validate spec
   swagger-cli validate volleymanager-openapi.yaml
   ```

1. **Generate Mock Server**

   ```bash
   # Using Prism (https://stoplight.io/open-source/prism)
   npm install -g @stoplight/prism-cli

   # Run mock server
   prism mock volleymanager-openapi.yaml
   ```

1. **Generate Interactive Docs**

   ```bash
   # Using Redoc
   npx @redocly/cli preview-docs volleymanager-openapi.yaml
   ```

1. **Test Against Real API**

   - Compare mock responses with real ones
   - Ensure all fields match
   - Test edge cases

## File Organization

```
docs/api/
├── volleymanager-openapi.yaml          # Main OpenAPI spec
├── CAPTURE_INSTRUCTIONS.md             # This file
├── captures/                           # Raw captured data
│   ├── assignments_request.txt
│   ├── assignments_response.json
│   ├── compensations_request.txt
│   ├── compensations_response.json
│   ├── exchanges_request.txt
│   └── exchanges_response.json
└── README.md                          # Overview
```

Create the `captures/` directory and save raw data there before formatting into OpenAPI.
