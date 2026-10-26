# Placed by, connection checks and request limits

Three things dcb-service 9.1.0 and 9.2.0 record that this app shows, each behind its own flag
([DEPLOYMENT.md](DEPLOYMENT.md)).

## Placed by (9.2.0)

`PatronRequest.placedByStaff`, on a request's page as **Placed by**: staff, the patron, or not
recorded when DCB cannot tell, as for requests from before 9.2.0. Everyone who can open the page
sees it. It is not a column on the request lists yet: a list's columns are also its address,
saved views and filters, and a filter on a field 8.71.0 does not have would empty the list there.

## Connection check (9.2.0), administrators only

`HostLms.lastPing`, on **Service**, under each of the library's systems: whether DCB's last check
reached it and was accepted, when it ran, and when it last worked. The advice says what a library
can do, which is usually to tell the consortium's DCB support: the credentials are not edited here.
Read the same way as DCB Admin reads it (`src/helpers/hostLmsLastPing.ts`).

dcb-service answers an empty object to anyone but the administrators of the system's own
libraries, so a system the library only shares, such as a separate catalogue, may show "No check
recorded".

## Request limits, administrators only

On the library page:

- **Maximum active requests per patron** (`Agency.maxConsortialLoans`): DCB's own limit. Every
  release.
- **Maximum holds per patron at your library system** (`Agency.maxLocalHolds`, 9.1.0): the
  library system's limit, local holds included, which DCB checks before placing a request.

Either reads "Not set: DCB does not check it" when it is empty, which is what dcb-service 9.2.0
does with an empty one.

## Administrators only

The library page and Service already send anyone without `LIBRARY_ADMIN`, or with
`LIBRARY_READ_ONLY`, to Requesting. The connection check and the limits also check the role
themselves (`isReadOnly`), so a later change to who can open those pages does not show them.
