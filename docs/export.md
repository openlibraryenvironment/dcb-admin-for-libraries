# Exporting requests

The borrowed-requests and supplied-requests grids export through a wizard. Every
other grid offers the grid's own "Export current page as CSV" and "Print current
page", and so do these two, unchanged: those write only the rows already on screen.

## The wizard

**Export…** in a request grid's Export menu opens it. It asks for:

| Choice | Options |
|---|---|
| Columns | the grid's columns plus the pickup location and the patron's Host LMS; the grid's visible columns are checked to begin with; at least one |
| File name | defaults to `patronRequests_export` or `supplierRequests_export`; no path separator, no character a file system refuses, no leading dot, at most 120 characters; the extension is added |
| Rows | matching the current filters · all rows, ignoring the filters · the rows selected in the grid |
| Format | CSV, TSV, Excel (.xlsx) |

The file is written from rows fetched from `dcb-service` for the export, never from
the rows the grid holds, and a selected-rows export asks for those ids again.

Text a spreadsheet would run as a formula (`= + - @`, tab, carriage return) is
prefixed with `'` in CSV and TSV. In Excel every text value is written as a text
cell, which Excel shows and never evaluates; date columns are written as dates.

## The library guard

A request leaves in a file only if one of the user's libraries is party to it:

1. **(a)** it is the request's patron library;
2. **(b)** it is the request's supplying library;
3. **(c)** the request's pickup location belongs to it.

"The user's libraries" is every code in the `code` claim of the signed-in session,
read when the export starts. It is never the library chosen in the header, and
never anything typed. No code, no export.

`src/helpers/exportScope.ts` enforces it twice.

**In the query.** Every `LoadPatronRequestsForExport` request sends
`(<guard>) AND (<the grid's query>)`. The guard does not depend on the grid's own
scope, so a grid whose scope is wrong or missing still cannot export outside it.
Values are quoted and escaped, and every join is an explicit `OR`, because
`dcb-service` silently drops a clause joined by an implicit operator.

| dcb-service | Guard |
|---|---|
| 9.0.0 and later (`VITE_FEATURE_AGENCY_SCOPED_REQUESTS` on) | `patronAgencyCode:"A" OR … OR supplyingAgencyCode:"A" OR … OR pickupLocationCode:"<location id>" OR …` |
| 8.71.0 (flag off) | `supplyingAgencyCode:"A" OR … OR pickupLocationCode:"<location id>" OR …` |

`pickupLocationCode` holds a Location id. The ids are every location of the user's
agencies, from one `agencies(query: code:"A" OR …)` request with `locations { id }`,
which is the one path to an agency's locations on 8.71.0 as well as 9.x. A guard is
refused rather than sent with more than 1,000 locations.

**On every row.** Each returned row must prove (a), (b) or (c) from its own fields,
or it is dropped: `requestingIdentity.resolvedAgency.code` (selected only where the
flag is on), any `suppliers[].localAgency`, or `pickupLocationCode`. A missing field
proves nothing. Codes match exactly, as `dcb-service` matches them. A request that
matches through two suppliers is returned twice by the server and exported once.

**8.71.0 cannot express (a).** It has no `patronAgencyCode` filter and no
`resolvedAgency`, and `patronHostlmsCode` names the Host LMS, which every co-tenant
library on a shared system has in common. The guard narrows rather than widens: on
8.71.0 a borrowed request appears in an export only if one of the user's libraries
supplied it or owns its pickup location.

### What dcb-service already enforces

| Release | `patronRequests` |
|---|---|
| main | role gate (staff roles only); for a caller without `ADMIN` or `CONSORTIUM_ADMIN`, ANDs `patronAgencyCode IN claims OR supplyingAgencyCode IN claims` onto the query, and an empty claim returns nothing (`AgencyAccessScope`) |
| 9.0.0 | the same scope, with no role gate on the fetcher |
| 8.71.0 | nothing: the client's query runs as sent |

So on 9.x the server already confines a library user to (a) and (b), and the
pickup condition widens nothing for them; it matters to a consortium administrator,
whom the server does not scope. On 8.71.0 the client guard is the only scope there is.

## Bounds

- 100 rows a request (`EXPORT_PAGE_SIZE`), one request at a time.
- At most 10,000 rows an export (`MAX_EXPORT_ROWS`). A larger result is refused
  after the first page, with a message asking for narrower filters, rather than
  written as a truncated file.
- Pickup location names are looked up after the guard, 100 ids a request.
- **Cancel** in the progress dialog aborts the request in flight.

`dcb-service` sorts on the grid's sort column only, so a page boundary on a
column with repeated values can skip or repeat a row; the de-duplication above
removes repeats, not skips.

## Excel and Content-Security-Policy

The Excel library is imported dynamically in `src/helpers/dataGrid/xlsxWorkbook.ts`
and nowhere else, so it is a chunk of its own that only an Excel export downloads.
It contains one direct `eval`, in a `vm` polyfill that writing a workbook does not
reach. `e2e/export-wizard.spec.ts` serves the page under
`script-src 'self' 'sha256-<inline script>'`, with no `'unsafe-eval'`, and asserts
that an Excel export completes with no violation, so no worker or extra CSP source
is needed.

That page does report one violation at start-up, from zod rather than Excel: zod
probes `Function("")` once, inside a `try`, and falls back when it is refused.
`z.config({ jitless: true })` would stop the probe.
