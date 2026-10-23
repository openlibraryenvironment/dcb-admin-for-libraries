# Clean up

Clean up closes a patron request and deletes the temporary records DCB created for it in the
library systems involved: the borrowing library's virtual item and bib, and the holds. It is
offered on **Patron requests** (what your library borrowed), **Supplier requests** (what it
supplied), and on the page of a single request.

## Who may clean up

The rule is dcb-service's own, so the app offers exactly what the service accepts.

| | dcb-service 8.71.0 | dcb-service 9.0.0 and later |
|---|---|---|
| Roles | `LIBRARY_ADMIN` (and consortium roles) | the same |
| Which library | the borrowing library or a supplying library | the same; 9.2.0 refuses anyone else with a 403 |
| Status | in error, or not yet shipped; never while the item is out | any status but a finished one (`COMPLETED`, `FINALISED`, `CANCELLED`, `ARCHIVED`, `HANDED_OFF_AS_LOCAL`) |
| Item out | not offered | refused with a reason, and can be cleaned up anyway |

8.71.0 itself checks neither the library nor whether the item is out. Cleaning up an item that
is out deletes the borrowing library's records while the item is still in a patron's hands or
in transit, and leaves the supplying library nothing to check it in against. So against 8.71.0
the app offers it only where the item has not left the library, and the borrowing library is
known by its Host LMS, as the Patron requests grid scopes it.

Against 9.0.0 and later (`VITE_FEATURE_GUARDED_CLEANUP`) the request is checked for updates
first, and the service decides. The borrowing library is known by the request's
`requestingIdentity.resolvedAgency` (`VITE_FEATURE_AGENCY_SCOPED_REQUESTS`).

`isCleanupEligible` in `src/helpers/cleanupPatronRequest.ts` holds the rule;
`src/helpers/cleanupPatronRequest.test.ts` and `e2e/cleanup.spec.ts` check it.

## Cleaning up anyway

When 9.0.0 or later refuses because the item is out, the app says why and offers **Clean up
anyway**. A second dialog repeats what that deletes and asks the user to tick "I have
confirmed where the item is" before the button works. It then sends `force=true`, without
checking for updates again: the refusal has just done that.

The service lets a library administrator force a clean up, so the app does too. The second
confirmation is the safeguard: it is for the case where the item's whereabouts are known by
other means, such as the item being back on the supplying library's shelf while its system
has not reported it.

On a grid, the refused requests are listed in the results dialog, and **Clean up anyway (n)**
forces all of them after the same confirmation, five at a time.
