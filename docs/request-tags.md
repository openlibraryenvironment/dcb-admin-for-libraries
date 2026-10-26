# Tags on requests

dcb-service 9.2.0 lets the libraries involved in a patron request tag it from a list the
consortium manages: `DAMAGED`, `MISSING_PIECES`, `PATRON_CONTACTED`, `RETURN_DISPUTED` and
`SLOW_TO_SHIP` to start with. The rules are dcb-service's, in its
`docs/operational/patron-request-notes.md`. This app shows them on a request's page behind
`VITE_FEATURE_REQUEST_TAGS` ([DEPLOYMENT.md](DEPLOYMENT.md)).

## What staff see

On the General tab, under **Tags**, each tag with the libraries that applied it:
"Damaged: Library A, Library B". A tag the consortium applied names the consortium.

A library administrator can apply a tag in the library's name, and remove the library's own.
Another library's tag, or the consortium's, is shown but cannot be removed here. Applying offers
only the active tags the library has not applied already. A retired tag stays on the requests
that have it.

## Which library a tag is applied as

The same rule decides which library a note is written as ([request-notes.md](request-notes.md)).

dcb-service takes the user's agencies that are involved in the request: the borrowing library,
the current supplier and the pickup library. When there is exactly one, the app sends it. When
there are several, as on a shared system, **Tag as** asks which. When there are none, as for a
library whose earlier attempt to supply did not go ahead, the page says only the libraries
involved can tag the request, and dcb-service would refuse it anyway.

## What is not here, and why

- **Not on the request lists.** dcb-service resolves a request's tags, and checks that the
  caller may see them, once per request. A column would cost two or more queries per row, at
  up to 100 rows a page.
- **No filter by tag.** dcb-service's request query reaches a request's own fields and a fixed
  set of joined ones; tags are kept in their own table with no relation from the request, so the
  query cannot name them. The table has the index a filter would use
  (`idx_pr_tag_code (tag_code, patron_request_id)`), so it is a dcb-service change, not a
  database one.
- **Notes** are their own feature, behind their own flag: [request-notes.md](request-notes.md).
