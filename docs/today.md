# Today

The page a library administrator lands on: what is waiting on the library now, and
what changed in the last 24 hours. The library profile it replaced as the landing page
is at `/library`, the "Your library" tab. Read-only users never see Today; they land on
Requesting, as before.

## What each count is

Every count belongs to one of the two request grids, and is that grid with a filter
applied. Selecting a count opens the grid with exactly those filters, so the number and
the rows always agree; `tests/today.test.ts` fails if a count's query and its grid's
query ever differ.

| Count | Grid | Filter |
| --- | --- | --- |
| Ready for your patrons to collect | Patron requests | status `READY_FOR_PICKUP` |
| On their way to your patrons | Patron requests | status `PICKUP_TRANSIT` |
| For you to fill | Supplier requests | status `REQUEST_PLACED_AT_SUPPLYING_AGENCY` |
| On their way back to you | Supplier requests | status `RETURN_TRANSIT` |
| Your patrons' requests that failed | Patron requests | status `ERROR`, updated in the window |
| Requests you were supplying that failed | Supplier requests | status `ERROR`, updated in the window |
| Requests no library could fill | Patron requests | status `NO_ITEMS_SELECTABLE_AT_ANY_AGENCY`, updated in the window |
| Placed by your patrons | Patron requests | created in the window |
| For you to supply, arrived | Supplier requests | created in the window |

"Waiting on you" has no window: a request ready for collection since Friday is still
waiting on Monday. The window is the 24 hours before the counts were taken, and the
page says when that was. A count of 0 is not a link. A count the service did not return
is shown as "not known", never as 0.

## On each dcb-service release

The counts are GraphQL `patronRequests` queries with the same scope as the grids, so
they work on 8.71.0 and later with no other change:

- **Supplier requests** are the requests whose supplying agency is the user's library.
- **Patron requests**, before `VITE_FEATURE_AGENCY_SCOPED_REQUESTS`, are the requests
  whose patron is on the library's Host LMS. Where several libraries share a Host LMS,
  that includes the other libraries' patrons, as the Patron requests grid does. With the
  flag on, they are the requests whose patron belongs to the library.

With `VITE_FEATURE_INSIGHTS` on, the page also links to Insights.

## What it costs

All nine counts are one GraphQL request, each asking for one row and its total. The
answer is kept for five minutes; "Refresh counts" asks again sooner. dcb-service 8.71.0
has no index on request status or dates, so each count reads the request table: at
100,000 requests a year that is a few hundred thousand rows, nine times, per load.
