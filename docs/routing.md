# Route guards

## Guards run in `beforeLoad`

Not in a `useEffect`. An effect renders the protected page, lets its loader and
its queries run, and corrects afterwards — so the page a user may not have is
painted, and the requests it makes are sent. `e2e/insights.spec.ts` asserts
against exactly that by counting statistics calls, and `e2e/read-only.spec.ts`
by watching for the `h1` of the page being left.

## Why the guards were advisory until now

Passing `context` to `RouterProvider` updates what `beforeLoad` will *see*. It
does not re-run `beforeLoad` for matches that have already resolved.

On a cold load that ordering is fatal to a guard. `react-oidc-context` restores
the session asynchronously, so every `beforeLoad` runs first, finds
`isAuthenticated` false, correctly decides it cannot judge — and is never asked
again. The layout's `useEffect` was picking up the pieces, which is why it
existed and why it looked necessary.

`App.tsx` now calls `router.invalidate()` once `auth.isLoading` goes false. The
guards re-run with the session in hand, and the effect is gone. It calls it again
when the signed-in identity changes, and not when a silent renewal replaces the
token: [auth.md](auth.md).

**`isAuthenticated` false means undecidable, not "no roles".** A guard that
treats it as a denial fights the layout's sign-in redirect, which is what
actually keeps a signed-out visitor out. Let it pass and judge on the next run.

## Starting sign-in

`AuthenticatedLayout` starts the redirect to Keycloak itself, once per mount,
and only when nothing else is in flight: no callback parameters in the URL, no
session restore, no navigator running, no session, **and no error**.

It used to be `react-oidc-context`'s `withAuthenticationRequired`, which (3.3.1)
re-calls `signinRedirect` whenever the auth state changes and never reads
`auth.error`. A failed redirect sets the error and changes the state, so with
Keycloak down the tab re-requested the discovery document for as long as it
stayed open. The root route compounded it by unmounting the whole tree while a
navigator ran, so the failed page remounted and started again.

A failure goes to `/login`, which shows the error and offers the button: the
person decides when to try again. That also covers Keycloak sending back
`?error=access_denied`, which the wrapper rendered as a blank page because the
callback parameters suppressed its redirect and nothing else rendered.
`e2e/login.spec.ts` asserts both.

## Read-only users

`LIBRARY_READ_ONLY` may use `/requesting` and nothing else.
`src/helpers/readOnlyAccess.ts` holds the predicate and
`tests/readOnlyAccess.test.ts` pins it, including the case that mattered: the
old rule tested `pathname.includes("/requesting/")` **with a trailing slash**,
so `/requesting` itself failed it and the guard bounced the user off the page
it had just sent them to. From an effect that settled after a render. Thrown
from `beforeLoad` it would have been an infinite redirect, which is how the bug
was found.

Hiding a tab is not security; `dcb-service` decides what a token may read. These
guards are there so a read-only user is not shown a page of errors, and so the
client does not ask for data it has no business asking for.

## The base path

`vite.config.ts` sets an **absolute** base, never a relative `./` one, and it
is the single source of the router basepath — `main.tsx` reads it back as
`import.meta.env.BASE_URL`, and it must never be re-supplied at runtime.

A relative base resolves asset URLs against the *current page path*, and every
SPA-fallback host serves `index.html` **at** the deep URL rather than at `/`.
Refreshing `/dcb-admin-for-libraries/patronRequests/<id>` would therefore
resolve `./assets/index-<hash>.js` against
`/dcb-admin-for-libraries/patronRequests/` and 404 every asset.

There is no `server.historyApiFallback`. That is a webpack-dev-server option
which Vite has never had, so it was dead config that read like the thing
keeping deep links alive. Vite's SPA fallback comes from the default
`appType: "spa"` and is base-aware.

The router owns the prefix from there on; what happens when something else
tries to add it too is in `docs/testing.md`.

## Not found

TanStack's built-in `notFoundComponent` is the bare string "Not Found" — no
heading, no address, and no way out of the dead end but the back button.

That is what made a doubled base path hard to place: the app reported the
symptom without reporting the address it had failed to match, so the doubled
segment was only visible in devtools. `NotFound` shows the address.

**The way out is home, not "go back".** The previous page is what produced the
bad link, so returning to it re-offers the same dead end.

## Grid state is URL state

A server-paged grid's filter, sort and page live in its route's search, so a
list can be shared, bookmarked, opened in a new tab, and is put back exactly
by the back button from a detail page. Every such route declares
`validateSearch` with its grid's schema; `tests/gridRoutesValidateSearch.test.ts`
fails one that does not. A hand-typed or stale link cannot crash the page or
reach the server unchecked: each key `.catch()`es to absent, a sort or filter
must name a column the grid offers it on, with one of that column's operators
and a value of that column's type, and a page size must be one the grid offers.
Anything else is dropped, not passed on.

```
/patronRequests?page=1&sort=status%3Aasc&filters=%5B%7B%22id%22%3A1%2C%22field%22%3A%22status%22%2C%22operator%22%3A%22is%22%2C%22value%22%3A%22COMPLETED%22%7D%5D
```

Only what differs from the grid's defaults is written, and every change
**replaces** the history entry rather than pushing one, so paging and typing do
not flood history. Filter typing reaches the URL after the same 500 ms debounce
the request always had. A grid inside a page with search of its own - the
audit log, a tab of `/patronRequests/$id` - keeps its state under one key,
`audit`.

The grid is shown what the reader just did at once, not when the URL catches
up a tick later: MUI X treats a sort or filter it receives late as a fresh
change and sends the reader back to the first page.

Column visibility is a device preference, not a view, so it stays in the
persisted grid store. That store no longer persists filter, sort or page; the
client-paged grids (record items, the cleanup dialog) keep theirs in memory for
the session.

### What never goes in the URL

A patron barcode is personal data and close to a credential, and a URL is not
private: every reload or deep link sends the whole URL to the host's request
logs (Cloudflare, S3), it travels in the Referer of every asset the page
fetches, it sits in the browser history of a shared library desk, and it goes
wherever someone pastes it. Quick-search text is free text a member of staff
can paste a barcode into, so it is treated the same. Filters on the fields in
`PRIVATE_FILTER_FIELDS` (`src/helpers/dataGrid/gridSearch.ts`) and quick-search
values are kept in the tab's history entry instead, keyed by grid. They survive
back, forward and a reload of that tab, reach `dcb-service` only inside the
GraphQL request body, and are absent from a copied link. A field that carries a
patron's barcode is added to that constant, and nowhere else.

### Adding a grid

1. Define it in `src/helpers/dataGrid/gridDefinitions.ts` with `defineGrid`:
   an id, the columns **as rendered** (they are the sort and filter allow-list),
   the default sort, page size and column visibility.
2. Give its route `validateSearch: yourGrid.searchSchema`.
3. In the component, `useSyncedDataGrid(yourGrid, Route.useSearch())`; hand the
   grid `filterModel`, `sortModel`, `paginationModel` and their handlers, and
   build the request from `appliedFilterModel`, which is the debounced one.
4. `useDataGridErrorSafely(grid, isError, error)` puts the grid back to its
   defaults when the server cannot process a filter or sort.

