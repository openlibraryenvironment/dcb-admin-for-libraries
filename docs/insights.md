# Insights, scope, and outcome colour

## Which library is being looked at

The `code` claim is read as a **list**, not a scalar. One person can be
responsible for several libraries: whoever administers a shared Koha on behalf
of some of its tenants is not a consortium administrator and must not be given
consortium-wide access, but neither do they belong to exactly one library.
`dcb-service` already accepts the claim in either shape. Almost every
deployment issues a single value, and `useAgencyCodes` returns a one-element
list for those, so nothing downstream has to care which kind of user it is
looking at.

**The selection is one selection, in the store.** Fourteen components ask which
library is being looked at — the header, six routes, three request forms, the
search result and the shared query hook. Holding it in `useState` inside the
hook gave each of them a private copy, so changing library in the header
relabelled the picker and left every grid on screen scoped to the previous one.
It is client UI state shared across the tree, which is what the store layer is
for. Persisted so the choice survives a reload, and namespaced by app base
because one origin may host several of these apps under path prefixes.

**The picker renders nothing unless the claim names more than one library.**
Most people administer a single one, and a picker with one entry is worse than
no picker: it implies a choice that does not exist and invites the question of
what the other option would have been. The people it is for are shared-system
administrators — someone running one Koha on behalf of several of its member
libraries, who is not a consortium administrator and should not be made one to
do the job.

## Asking for "the requests my library borrowed"

`patronAgencyCode` is the correct question and `patronHostlmsCode` is not. A
patron request records the Host LMS its patron came from but not their library,
so on a shared system — sixty libraries on one Koha — filtering by Host LMS
returns every co-tenant's requests rather than your own.

It is behind a flag because the field does not exist before dcb-service 9.0.0.
There, the Lucene query builder resolves a filter name against the entity's
properties and raises on one it does not recognise, so sending
`patronAgencyCode` to an older backend does not fall back to something broader
— it fails the query outright and empties the grid.

**Both forms are wrong on a shared system running an older backend.** The flag
chooses between "shows too much" and "shows nothing", and only the newer
backend can be correct, which is the point of turning it on.

This is a Lucene filter string rather than a GraphQL selection, which is why it
does not live in the capability registry's `fields` — but it moves with the
same flag, because the same dcb-service release is what makes both halves
answerable.

## The statistics API

The library filter is renamed once, at the serialisation boundary, to
`requestedLibraryCode`. Why, and why sending the old name is silently wrong
rather than an error: `docs/service-compatibility.md`.

**Trade partners returns the page, not the first row.** Unlike the older
summary endpoints, the helper does not unwrap. The whole point of this endpoint
over `dashboard-metrics`' fixed top ten is that the tail is reachable, and a
helper that quietly returned page zero would put it back out of reach.
`totalSize` counts partners rather than requests, so it drives a page control
directly. `libraryCode` is required — "who do we trade with" needs a "we" — so
the caller supplies it rather than relying on the consortium-wide default.
Sorting is optional: dcb-service applies `total_count` descending by default,
so "top partners" costs the client nothing.

## Outcome colour

`outcomeTextColour` returns a **theme token**, not a mode-dependent choice.
This app runs MUI with `cssVariables` and `colorSchemes`, so
`theme.palette.mode` does not track the active scheme — reading it hands dark
mode the light values. The scheme is resolved by CSS, per scheme, from the
tokens in `colorSchemes.{light,dark}.palette.primary`.

### Why custom tokens rather than success/error

Measured against the two grounds these figures actually sit on. The second is
the data grid's selected-row tint, which is where the reader's own library sits
in the peer table — so it is exactly the row most likely to be read.

| token | light: white / selected | dark: #121212 / selected |
|---|---:|---:|
| `success.main` | 5.13 / **4.47** ✗ | 7.92 / 6.10 |
| `primary.outcomeGood` | 7.87 / 6.87 ✓ | 7.92 / 6.10 ✓ |
| `primary.outcomeBad` | 5.62 / 4.91 ✓ | 6.27 / 4.83 ✓ |

`error.main` was `red.A400` when these tokens were introduced, and failed on
three of the four grounds — 3.85:1 against white, 3.36:1 on the light selected
row, 3.75:1 on the dark one. That was fixed separately in September 2026
(`#c62828` light, `#e57373` dark) and `tests/themeContrast.test.ts` now holds
every token to the floor. The outcome tokens remain, because they say what they
are for: these panels are reporting an outcome, not an error.

Colour is never the only signal in either panel — the peer table ranks its rows
and marks the reader's own in text, and the KPI delta ships an arrow glyph — so
this is about 1.4.3 rather than 1.4.1.
