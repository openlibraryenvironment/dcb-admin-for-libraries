# Running against more than one dcb-service

R-19. This application is deployed against several `dcb-service` releases at
once, and a GraphQL field the server has never heard of is **not a null**. It is
a validation error, and it fails the whole operation. `LoadLibrary` runs in the
header on every page and in six routes, so one field selected a release too
early does not grey out a form — it takes the application down.

## The capability registry

`src/constants/serviceCapabilities.ts` is the list of which fields arrived in
which release, and each row is a **claim about a dcb-service release** rather
than a note. `src/constants/serviceCapabilities.test.ts` checks every claim
against the schemas of those releases, committed beside this application.

That is what makes it extendable rather than a one-off. To gate the next
feature, add a row, commit that release's schema as
`schema.v<version>.graphqls`, and the tests either agree with you or fail.

A wrong row is otherwise invisible: the flag gets switched on at the upgrade and
the feature fails in an environment, which is the expensive place to find out.

## Three schema passes, not two

`src/queries/schemaConformance.test.ts` validates every document this
application can emit, three times, with the flags in the state each deployment
would have:

| Flags | Schema | Deployment |
|---|---|---|
| all on | `schema.graphqls` | dcb-service `main` |
| all off | `schema.v8.71.0.graphqls` | the release before 9.0.0 |
| the release's own | `schema.v9.0.0.graphqls` | a 9.0.0 deployment |

**The third pass is the one that was missing**, and it stopped being optional
when `schema.graphqls` diverged from the 9.0.0 tag: `V9_0_008` added
`supportUrl` after it. Neither of the others can catch a field gated at the
wrong *threshold* — all-flags-on validates against a schema that has
everything, all-flags-off against one that has nothing, and a deployment on the
9.0.0 release is in neither state.

The flags change the documents themselves, so the flag state has to be set
before a document is **built**, not merely before it is rendered.

A note in a CONTRIBUTING.md saying "remember to flag fields from an unreleased
dcb-service" prevents none of this. The test does, on the next release as well
as this one, in milliseconds and with no server.

## What only an end-to-end test can prove

`schemaConformance` proves the **documents** are valid.
`e2e/legacy-service.spec.ts` proves the **application** is: against 8.71.0 the
page renders, the brand fields are not offered, and — the part a unit test
cannot see — the request that goes over the wire does not name them. Every flag
is off there, which is the deployed default and the state of an environment
that has never heard of them.

`brandLogoUrl`, `brandLogoAlt` and `defaultThemeName` arrived on `Library` in
9.0.0 and are the worked example.

## Two fields, two thresholds

`e2e/library-presence.spec.ts` covers §V-11.1, the library's presence links, and
exists because the two fields are gated differently:

- **`patronWebsite`** has been on `Library` since 5.11.1, so it is selected
  unconditionally and needs no flag. It was already fetched and displayed; it
  was never editable.
- **`supportUrl`** arrived in `V9_0_008`, after the 9.0.0 tag, so it is behind
  its own flag. `legacy-service.spec.ts` holds the other end: 8.71.0 is never
  asked for it.

Why the fields matter at all: a patron who reaches discovery from a search
engine has no route back to opening hours, branches or joining, and no way to
say the search itself is broken. Discovery holds neither fact. The library does,
and its footer renders both (§V-11.2).

## Statistics are scoped by the token, not by the URL

The library filter goes to dcb-service as **`requestedLibraryCode`**, never
`libraryCode`. `StatsScopeGuard` treats it as a *request* checked against the
caller's token rather than an instruction, and dcb-service's own
`StatsScopeArchitectureTests` fails its build if an endpoint goes back to
binding the trusted name.

Sending the old name from here is **silently wrong** rather than an error: the
endpoint ignores it, and a consortium administrator asking for one library gets
consortium-wide figures rendered under that library's name. Nothing else would
catch it, because every library-scoped caller gets the right answer anyway —
the guard falls back to their token. `tests/statsApiParams.test.ts` is the
whole of the protection.

The same reasoning is why this application has **no library picker and must
never grow one**: the library it reports on comes from the access token's agency
claim and from nowhere else. The guard means a mismatch is refused, but the
request this client sends is what a reviewer reads to decide whether it is
honest. `e2e/insights.spec.ts` asserts that.
