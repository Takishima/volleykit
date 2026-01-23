---
"volleykit-web": minor
"@volleykit/shared": minor
---

Add pickFromRefereeGameExchange endpoint for exchange takeover

- Add PUT endpoint to OpenAPI spec for taking over referee assignments from the exchange
- Update `applyForExchange` API method to use the confirmed endpoint
- Add `PickExchangeResponse` type for the API response
