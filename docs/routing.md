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

A server-paged grid's filter, sort, page, page size and columns live in its route's search,
readably, so a list can be shared, bookmarked, opened in a new tab, and is put back exactly by the
back button from a detail page. The grammar, what never goes in a URL, the reader's last view,
what Back does, old links and how to add a grid: [url-view-state.md](url-view-state.md).

Each of these grids can copy its address as a link and save its filter and sort for the tab:
[saved-filters.md](saved-filters.md).
