# API Captures

This directory contains raw captured request/response data from the VolleyManager website.

## Documented Endpoints

### Core Functionality

- [assignment_actions.md](assignment_actions.md) - Assignment confirmation/actions
- [compensation_edit_endpoints.md](compensation_edit_endpoints.md) - Compensation editing
- [compensation_pdf_download.md](compensation_pdf_download.md) - Compensation PDF receipt download
- [convocation_info_endpoint.md](convocation_info_endpoint.md) - Convocation details
- [exchange_actions.md](exchange_actions.md) - Exchange apply/withdraw
- [game_details_endpoints.md](game_details_endpoints.md) - Game information
- [profile_endpoints.md](profile_endpoints.md) - User profile management
- [role_selection.md](role_selection.md) - Role/context switching
- [ical_calendar.md](ical_calendar.md) - Calendar export

### eScoresheet & Nomination Lists

- [escoresheet_endpoints.md](escoresheet_endpoints.md) - Electronic scoresheet management
- [nomination_list_endpoints.md](nomination_list_endpoints.md) - Team nomination lists
- [search_and_resources_endpoints.md](search_and_resources_endpoints.md) - Search and file upload

## How to Capture

### Using Browser DevTools (Recommended)

1. **Open VolleyManager in your browser** with DevTools open (F12)
1. **Go to Network tab**, filter by Fetch/XHR
1. **Navigate to the page** (e.g., "Mes convocations")
1. **Find the POST request** in the list
1. **Right-click the request** → Copy → Copy as cURL

Then paste the cURL command into a file here named:

- `assignments_curl.txt`
- `compensations_curl.txt`
- `exchanges_curl.txt`

Also:
6\. **Click on the request** to see details
7\. **Go to Response tab**
8\. **Copy the JSON response** and save to:

- `assignments_response.json`
- `compensations_response.json`
- `exchanges_response.json`

## Alternative: Use Browser Console

Paste this in the Console tab while on the page:

```javascript
// After the page loads and API call completes
copy(JSON.stringify({
  requests: performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/'))
    .map(r => ({
      url: r.name,
      method: 'POST', // Most are POST
      duration: r.duration,
      size: r.transferSize
    }))
}, null, 2))
```

This copies a summary to clipboard.

## Files to Create

- [ ] `assignments_request.txt` - Form data from Payload tab
- [ ] `assignments_response.json` - Response JSON
- [ ] `compensations_request.txt` - Form data
- [ ] `compensations_response.json` - Response JSON
- [ ] `exchanges_request.txt` - Form data
- [ ] `exchanges_response.json` - Response JSON
- [ ] `season_response.json` - Active season endpoint
- [ ] `settings_response.json` - Association settings endpoint
