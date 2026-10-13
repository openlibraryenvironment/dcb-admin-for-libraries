# Today

The page a library administrator lands on: what is waiting on the library now, and
what changed in the last 24 hours. The library profile it replaced as the landing page
is at `/library`, the "Your library" tab. Read-only users never see Today; they land on
Requesting, as before.

## What each count is

Every count belongs to one of the two request grids, and is that grid with a filter
applied. Selecting a count opens the grid with exactly those filters, closed at the moment
the counts were taken, so a windowed count and its rows agree; `tests/today.test.ts` fails
if a count's query and its grid's query ever differ. A count of what is waiting has no
window, so its grid shows the state now, which may have moved since the count.

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

With `VITE_FEATURE_INSIGHTS` on, the page also links to Insights, unless the Insights tiles
below are on.

## Optional parts

Each is off until its flag is `true`; `docs/DEPLOYMENT.md` section 2a lists the flags. A
part that needs a dcb-service capability also needs that capability's flag, and
`src/helpers/featureFlags.ts` holds that rule, not the page.

| Flag | What it adds | Also needs |
| --- | --- | --- |
| `VITE_FEATURE_TODAY_SINCE_LAST_VISIT` | A choice between the last 24 hours and "since your last visit" for the problems and activity sections. The window is in the URL (`?window=visit`). | — |
| `VITE_FEATURE_TODAY_LAST_WEEK` | Under each problem and activity count, how it compares with the same span a week earlier, in words. Over the last 24 hours only: since a visit up to 30 days ago, a week earlier would overlap the span itself. | — |
| `VITE_FEATURE_TODAY_SETUP_CHECKLIST` | For a library that has never borrowed or supplied, which parts of its profile are filled in, with a link to it. | — |
| `VITE_FEATURE_TODAY_INSIGHTS` | The Insights overview tiles for the last 7 days: the same five tiles, and the same requests, as the Insights page. | `VITE_FEATURE_INSIGHTS` |
| `VITE_FEATURE_TODAY_ANNOUNCEMENTS` | The notices patrons can see now, up to three, with a link to manage them. | `VITE_FEATURE_ANNOUNCEMENTS` |
| `VITE_FEATURE_TODAY_LIBRARY_SPLIT` | For a user of more than one library, every count for each library, as a table. | `VITE_FEATURE_AGENCY_SCOPED_REQUESTS` |
| `VITE_FEATURE_TODAY_PICKUP_HERE` | Other libraries' patrons' requests ready, or on their way, for collection at this library's locations. Counted, not linked: no grid lists them. | `VITE_FEATURE_AGENCY_SCOPED_REQUESTS` **off** |

**"Since your last visit" is per browser.** The last visit is kept in this browser's
storage, so a desk computer shared by several people shares one. Reopening Today within
half an hour counts as the same visit, so the window does not move while someone works.
It reaches back at most 30 days.

**By library needs agency scoping** because before it, "your patrons" is everyone on the
library's Host LMS, and libraries sharing a Host LMS would all show the same numbers.

**Collections at your locations work on 8.71.0 only.** From 9.0.0 dcb-service shows a
library only the requests its patrons placed or it supplies; a request it only collects
is not returned, so the count would read 0. The flag is ignored while
`VITE_FEATURE_AGENCY_SCOPED_REQUESTS` is on. "Other libraries' patrons" means patrons on
another Host LMS, as "your patrons" does on 8.71.0: a co-tenant's patron collecting here
is counted among your own. Past 50 locations only the first 50 are counted, so the
figure is a lower bound for a library with more.

## What it costs

All nine counts are one GraphQL request, each asking for one row and its total. The
answer is kept for five minutes and is not asked for again when the tab regains focus;
"Refresh counts" asks again sooner. dcb-service 8.71.0 has no index on request status or
dates, so each count reads the request table: at 100,000 requests a year that is a few
hundred thousand rows, nine times, per load.

The optional parts add requests only where they are on:

- last week: one request of five counts for each span counted;
- the checklist: one request of two counts of all time, not repeated once either is above 0;
- by library: one request of nine counts for each library after the first, at most ten
  libraries, the first sharing the page's own request;
- collections at your locations: one location lookup and one request of two counts.

With every part a deployment can have on at once, a load is at most 9 + 5 + 2 + 81 = 97
counts with the by-library table on a 9.x deployment, or 9 + 5 + 2 + 2 and a lookup with
collections at your locations on 8.71.0. The two cannot both be on.
