# Where the access token lives

One place: the `UserManager` that `src/application.tsx` creates and hands to
`AuthProvider`. oidc-client-ts keeps the session in session storage, and silent
renewal replaces the access token there a minute before it expires.

Everything that sends the token reads it from that store **when the request is
sent**, through `authHeaders()` in `src/helpers/auth.ts`:

- a GraphQL `queryFn` or `mutationFn` awaits it as its request headers;
- the REST client from `createRestClient` adds it in a request interceptor;
- the export and bulk cleanup loops await it per request, so a run that outlives
  a token sends the renewed one.

Nothing else holds a copy: no component memoises a headers object, no hook takes
one as a prop, and no query key carries one. `authHeaders()` refuses rather than
sending a request without a token.

## Why not in a query key

A query key is cache identity. With the token in it, every renewal (every four
minutes or so with Keycloak's default five-minute token) changed every key, so
every mounted query refetched at once - the on-site borrowing dialog's queries
included, mid-form - and the query cache held a second copy of the token.

Keys come from `queryKeys` in `src/helpers/queryKeys.ts` and carry the API base
and the business identifiers a response depends on: agency code, record id,
filters, page and sort. `tests/queryKeyCredentials.test.ts` fails a key that
names a token, a header or an `Authorization` value.

The statistics options in `src/helpers/statsApi.ts` and the availability keys in
`src/helpers/availabilityApi.ts` are factories of their own, shared by a route
loader or several callers, and carry no credential either.

## Who the cache belongs to

Keys do not say who is asking, so the cache must not outlive the person it was
filled for. `App.tsx` clears it when oidc-client-ts reports the user unloaded or
signed out, and re-runs the route guards only when the signed-in identity
changes - `isAuthenticated` or the `sub` claim - not on every renewal, which
replaces the `auth.user` object without changing who it is. Choosing another
library in the header changes the agency code, and with it every key that is
scoped by one.

`e2e/token-renewal.spec.ts` renews a session through the token endpoint and
asserts that nothing is re-sent, and that the next request carries the new token.
`src/helpers/auth.test.ts` asserts the cache is cleared on sign-out and kept on
renewal.
