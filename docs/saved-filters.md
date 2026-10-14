# Sharing and saving a grid's view

Every server-paged grid whose state is in its URL ([routing.md](routing.md), "Grid state is
URL state") has two more toolbar buttons:

- **Copy link to this view** copies the page's address. The address carries the grid's
  filter, sort and page, so whoever opens it, and is allowed to see the rows, sees the same
  view. A filter still being typed is written first, so the link is the grid as shown. A
  patron barcode filter and quick-search text are never in an address; when either is
  narrowing the grid, the confirmation says the link leaves them out.
- **Saved filters** opens a dialog that names the grid's current filter and sort and keeps
  it, lists what has been saved, applies one, and deletes one. Applying a saved filter
  replaces the grid's whole filter and sort and returns it to the first page.

## Where saved filters are kept, for now

In `sessionStorage`, under this app's namespace and one key per grid
(`<app>:savedFilters:<grid id>`). That makes them:

- **per tab.** A new tab starts with none, and closing the tab discards them. The one
  exception is the browser's own: a tab opened from this one by "duplicate tab" starts
  with a copy.
- **gone at sign-out.** `clearUserState` removes them, so a shared desk computer does not
  hand one person's saved filters to the next.
- **bounded.** At most 20 per grid, names up to 60 characters. Saving under a name already
  used on that grid, in any case, replaces it.

A saved filter holds only what the grid's URL may hold: filters on public fields, the AND
or OR between them, and the sort. Patron barcode and requester note filters and quick-search
text are not saved (`PRIVATE_FILTER_FIELDS`), and the dialog says so when any is applied. Whatever is read back from storage passes the
grid's URL allow-list again (`savedSearchOf` in `src/helpers/dataGrid/gridSearch.ts`) before
it is shown or applied, as a hand-typed URL does.

## When user preferences reach dcb-service

Saved filters and watched requests are meant to live in the user's preferences, linked to
their account. dcb-service `main` does not have that yet. The session store is built so
that switching is one change in one place:

1. **Write a second `SavedFilterStore`** (`src/helpers/savedFilters.ts`) against the
   preferences API, and choose it in `savedFilterStore`, which is the only place a store
   is chosen. The interface is async because that store is a server. Keep the session
   store as the fallback for releases without preferences, and put the choice behind a
   capability flag in `src/helpers/featureFlags.ts` like the other dcb-service
   capabilities, with its row in `docs/service-compatibility.md`.
2. **Key the cache on the account.** `queryKeys.savedFilters.list(gridId)` needs the API
   base and an opaque identity for the user beside the grid id. A tab's session store did
   not need them.
3. **Stop treating the list as never stale.** `staleTime: Infinity` holds only because
   nothing but this tab writes the session store. Another tab or device writes a server
   store.
4. **Map grids to the server's view types.** The server keys a saved view by an
   app-qualified view type, not by this app's grid id: `mainPatronRequests` is
   `libraries.borrowing` and `supplierPatronRequests` is `libraries.supplying`. The other
   grids that offer saved filters today (bibs, locations, mappings, audit log, request
   history) have no view type yet. Each needs one, with its own server-side field
   allow-list, or it keeps the session store.
5. **Take the bounds from the server.** It reports its own maximum number of saved views,
   and allows longer names than this app's 60 characters, so the client limit stays the
   tighter one. The server checks each search against a per-view-type allow-list and
   refuses a barcode, a requester note or quick-search text. `filterToSearch` and
   `savedSearchOf` already strip those, and the client keeps checking each search against
   the grid before applying it.
6. **Decide what happens to session filters.** A tab's saved filters can be offered for
   copying into preferences the first time the server store is used, or dropped. They are
   per tab, so dropping them loses little.
7. **Sign-out changes meaning.** Saved preferences stay with the account. `clearUserState`
   still clears whatever the session store holds.
8. **GraphQL documents are checked.** A new preferences query or mutation goes under
   `src/queries` or `src/mutations`, where `src/queries/schemaConformance.test.ts` checks it
   against each supported dcb-service schema.

The server store also renames a view, which the session store does not: there, saving
under an existing name replaces it.

The mutations are not optimistic. If they become so for the server store, each needs an
`onError` that rolls the list back.

Watched requests are not built yet. They should follow the same pattern: their own store
interface, a session implementation now, and the preferences one later.
