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
guards re-run with the session in hand, and the effect is gone.

**`isAuthenticated` false means undecidable, not "no roles".** A guard that
treats it as a denial fights `withAuthenticationRequired`, which is what
actually keeps a signed-out visitor out. Let it pass and judge on the next run.

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
