# View state in the URL

A server-paged grid's filters, sort, page, page size and columns are written in its page's URL,
in a form a person can read and share. DCB Admin and the discovery UI's search use the same
grammar; each app carries its own copy of the codec, `src/helpers/viewState/urlViewCodec.ts`, and
must pass the shared cases in `src/helpers/viewState/url-view-state-fixtures.json`. That file is
compared across the repositories, so **change it in all of them or not at all**.

```
/patronRequests?filters=status:ERROR,CONFIRMED&filters=errorMessage:contains:timed+out
               &sort=dateUpdated:asc&page=2&pageSize=50&hide=status
```

## The grammar

| State                   | Parameter           | Form                                                     | Left out when           |
| ----------------------- | ------------------- | -------------------------------------------------------- | ----------------------- |
| Filter                  | `filters`, repeated | `field[:operator]:value`                                 | no filter               |
| Any of several values   | —                   | `status:A,B`                                             | —                       |
| Combine filters with OR | `logic`             | `or`                                                     | AND, the default        |
| Sort                    | `sort`              | `field:asc` or `field:desc`                              | the grid's default sort |
| Page                    | `page`              | **one-based**                                            | the first page          |
| Page size               | `pageSize`          | one of the grid's options                                | the grid's default      |
| Columns                 | `hide`, `show`      | comma-separated fields, relative to the grid's defaults  | nothing differs         |
| Pinned columns          | `pinLeft`, `pinRight` | comma-separated fields, in pinned order                | nothing pinned          |
| Column order            | `order`             | the fewest leading fields that, followed by the rest in default order, give the reader's order | the default order |
| Aggregation             | `agg`               | `field:function`, comma-separated; `none` for explicitly none | the grid's default |

Field names are the grid's column `field`. Values are the server's values, never translated
labels, so a link means the same in every language.

The operator is left out for equality. Otherwise: `not`, `contains`, `phrase`, `notContains`,
`startsWith`, `endsWith`, `from` / `to` (on or after / on or before), `after`, `before`,
`between:<start>..<end>` (either end may be empty), `min` / `max` / `over` / `under`, and `empty` /
`notEmpty` / `last30Days` / `last90Days`, which take no value. `src/helpers/viewState/operatorWords.ts`
maps each grid operator to its word; `tests/gridFilterOperators.test.ts` fails for an operator a
grid offers that does not reach the URL and read back. "Is any of" with one value reads back as
"is": the URL has one word for both.

Pinned columns are pinned from the column menu, and moved with **Move left** and **Move right**
there as well as by dragging the header (WCAG 2.2 SC 2.5.7: no drag-only interaction). Pinned
columns are not part of `order`: pinning one does not write an order. A field the grid does not
render is dropped from either, and a column added later takes its default place. DAFL's grids
aggregate nothing, so `agg` is read and ignored here. Column widths, density and selection are
never in the URL. Popups (the column menu, the filter panel) render inside the grid's landmark or
dialog, not at the end of `<body>`.

A filter whose field or operator the grid does not offer is dropped, as is a value of the wrong
type for its column, or a select value that is not one of the column's fixed options. A
hand-edited link opens with its valid part.

In a list of values a comma inside a value is `\,`. An equality value that would read as
something else is written with an explicit `is` (`note:is:empty`).

### The request page's audit log

A page's main grid uses the bare names. The audit log, a tab of the request page, prefixes every
name with `audit.`: `/patronRequests/<id>?tab=3&audit.sort=auditDate:asc&audit.page=2`.

### The requesting search

`/requesting?filters=keyword:middlemarch&page=2&pageSize=50`. Its `filters` is the search query in
the catalogue's own syntax, not the grid grammar, and its page and page size follow the grid
grammar: `page` is one-based and left out on the first page. It never restores a last view: a
bare search page is a new search. Links written before 2.0.0 used `pageno`, zero-based, and
`pagesize`; they are still read (`src/helpers/requestingSearch.ts`) and never written.

## What never goes in a URL

Filters on a patron's barcode or a requester's note (`PRIVATE_FILTER_FIELDS` in
`src/helpers/viewState/gridView.ts`), and quick-search text, are kept in the tab's history entry
instead. A URL reaches host request logs, every asset's `Referer`, a shared desk's browser history
and wherever it is pasted. They survive Back, Forward and a reload of that tab, reach dcb-service
only inside the GraphQL request body, and are left out of a copied link, a saved filter and the
last view. Copy link says when it has left one out. A field that carries a patron's barcode or
words is added to that constant and nowhere else.

## Where a view comes from

1. **The URL**, when it carries any of the grid's parameters. It is the view.
2. **The reader's last view of the grid**, when the URL carries nothing at all and the grid
   remembers. It is written into the address before the page loads, and the toolbar says
   "Showing your last view" with **Reset to default** beside it.
3. **The grid's defaults** otherwise.

The last view changes **only when the reader changes something**: a filter, the sort, the page
size or the columns. Opening a link, paging through it, pressing Back or opening a filter row
without finishing it never replaces it, so one shared link cannot overwrite somebody's working
queue. The page is never remembered. Last views are kept per tab in session storage, for at most
50 grids, and cleared at sign-out.

Patron requests, supplier requests, mappings, locations and bibs remember. A request's audit log
and a record's requesting history do not: they are one record's, and transient.

## Back

The first change the reader makes on a visit adds one history entry; every later change on the
same visit replaces it. So **Back once returns to the view the reader arrived with** (the defaults,
their last view, or the link they opened) and Back again leaves the page. Typing and paging never
add entries, and Back from a request's page returns to the list exactly as it was left. The entry
Back returns to is marked as the grid's, so it is not mistaken for a bare address and given the
last view in its place.

A filter typed into the panel reaches the URL after 500 ms. A changed filter starts on page 1.

## Old links

Links written before this format still open the view they opened: filters as JSON grid items, the
audit log's state as one `audit={…}` object, and `sort=none`. A page number in such a link is
zero-based and is read that way. A link whose only parameter is `page` cannot be told from a new
one and opens one page earlier than it did, with its filters and sort intact. `tests/gridView.test.ts`
holds the old links, and the list only grows. The next write turns an old link into the readable
form.

## In the address bar

`src/helpers/viewState/searchSerialiser.ts` is the router's `stringifySearch`. The router's default
parser is kept: it reads a repeated key as an array and still reads every old JSON link, so
changing only the writer keeps old links working. `:`, `,` and `/` are left raw and a space is `+`.

## Adding a grid

1. Give it an id in `src/helpers/viewState/gridViewIds.ts`, with whether it remembers and, for a
   second grid on a page, its namespace. Route options load eagerly, so that file has no MUI X.
2. Define it in `src/helpers/dataGrid/gridDefinitions.ts` with `defineGrid`: the columns as
   rendered (they are the allow-list), the default sort, page size and columns.
3. The route's `validateSearch` is `validateGridSearch`, with the namespace for a second grid.
   A grid that remembers restores in `beforeLoad` with `rememberedViewRedirect`.
   `tests/gridRoutesValidateSearch.test.ts` fails for a grid route without `validateSearch`.
4. In the component, `useSyncedDataGrid(yourGrid, Route.useSearch())`; hand the grid its models
   and handlers, and build the request from `appliedFilterModel`, which lags the panel by the
   debounce.
5. `useDataGridErrorSafely(grid, isError, error)` puts the filter and sort back to the grid's own
   when the server cannot process them.
