# Pickup requests

dcb-service 9.2.0 makes the **pickup library** a party to a patron request, beside the borrowing
library and the current supplier: it can read the request, its audit trail, notes and tags. 9.0.0
and 9.1.0 hid such a request from it. **Pickup requests** lists them, behind
`VITE_FEATURE_PICKUP_REQUESTS` ([DEPLOYMENT.md](DEPLOYMENT.md)).

## What it lists

Requests whose pickup location is one of the library's locations and whose patron is another
library's: `pickupLocationCode:(…) AND NOT (<the Patron requests scope>)`, the same question Home's
collecting counts ask (`pickupHereQuery` in `src/helpers/home.ts`). The library's own patrons'
requests are under Patron requests, whichever location they collect at.

The locations come from the library's agency, as for an export's scope. At most 50 are named; a
library with more is told the list covers the first 50. dcb-service stores a pickup location as
its id, so the list is only as complete as the agency's location records.

## What it does not do

- **No clean up.** dcb-service lets only the borrowing library and the current supplier act on a
  request's workflow ([cleanup.md](cleanup.md)); the pickup library reads it.
- **Not on 8.71.0.** 8.71.0 scopes nothing, so the requests were always readable there; Home's
  collecting counts cover it, unlinked.

## Home

With this on, Home's "Collecting at your locations" counts link to the list, filtered to the
status each counts, and are shown under agency scoping too.
