# API Capture Plan

This document outlines what we need to capture from the browser to build an accurate mock API.

## Current Status

✅ Endpoints identified
✅ Test data samples collected
❌ Exact request parameters
❌ Complete response structures
❌ CSRF token mechanism

## Next Steps

For each endpoint, we need to capture:

1. **Exact Request Parameters**

   - Open browser DevTools Network tab
   - Find the POST request
   - Copy the Form Data section
   - Paste into the corresponding API doc file

1. **Complete Response Structure**

   - In the Network tab, click on the request
   - Go to "Response" tab
   - Copy the full JSON response
   - Paste into the corresponding API doc file
   - Note any nested structures, optional fields, etc.

1. **CSRF Token Handling**

   - Where does the token come from?
   - Is it in a cookie, meta tag, or initial page load?
   - How is it validated?

## Capture Checklist

### Assignments Endpoint

- [ ] Request: Sorting parameters
- [ ] Request: Exact date range format
- [ ] Request: All filter options
- [ ] Response: Complete item structure
- [ ] Response: Pagination details
- [ ] Response: Status indicators

### Compensations Endpoint

- [ ] Request: Sorting parameters
- [ ] Request: Date property name
- [ ] Request: Filter options (paid/unpaid, etc.)
- [ ] Response: Complete item structure
- [ ] Response: Payment status fields
- [ ] Response: Calculation breakdowns

### Exchanges Endpoint

- [ ] Request: Sorting parameters
- [ ] Request: Date property name
- [ ] Request: Status filters
- [ ] Response: Complete item structure
- [ ] Response: Qualification details
- [ ] Response: Application status

### Supporting Endpoints

- [ ] Active season: `/api/sportmanager.indoorvolleyball/api\cindoorseason/getActiveIndoorSeason`
- [ ] Association settings: `/api/indoorvolleyball.refadmin/api\crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty`
- [ ] Additional compensation: `/api/indoorvolleyball.refadmin/api\cadditionalcompensation`

## How to Capture

### Using Browser DevTools

1. Open Chrome/Firefox DevTools (F12)
1. Go to Network tab
1. Filter by "Fetch/XHR"
1. Perform the action on the website
1. Click on the request
1. Copy request/response details

### Using the Request Inspector

For each request, capture:

```
=== REQUEST ===
URL: [full URL]
Method: POST/GET/PUT
Headers:
  Content-Type: [value]
  Cookie: [redacted for security]

Form Data:
  [key]: [value]
  [key]: [value]
  ...

=== RESPONSE ===
Status: 200 OK
Content-Type: application/json

Body:
{
  // Full JSON response
}
```

## Mock API Requirements

Once we have all the data, the mock API should:

1. Accept the exact same request parameters
1. Return responses with the same structure
1. Handle pagination correctly
1. Respect date filtering
1. Support sorting
1. Maintain session state (simulate cookies)
1. Return realistic test data

## Implementation Notes

The mock API will be implemented as:

- A simple HTTP server (probably using Dart `shelf` package)
- In-memory data storage with test fixtures
- Can run locally during development/testing
- No need for actual database
