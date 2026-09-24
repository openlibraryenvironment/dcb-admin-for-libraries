# Testing

What the gates are, and the two ways each of them can lie to you.

## The gates

| Gate | Command | What it asserts |
|---|---|---|
| Types | `npx tsc --noEmit` | — |
| Lint | `npm run lint -- --max-warnings=0` | a warning is broken code |
| Unit | `npx vitest run` | **not** `npm run test`, which is watch mode |
| E2E | `npx playwright test` | the production build under `vite preview` |
| Accessibility | `npx playwright test e2e/accessibility.spec.ts` | zero axe violations on every surface, both schemes |
| Bundle | `node scripts/check-bundle-budget.mjs` | per-chunk gzipped budgets, after a build |
| Lighthouse | `npx lhci autorun` | transfer, CLS and the category scores |
| Naming | `npm run naming` | no name that only means something inside this workspace |
| Secrets | `npm run gates -- --only secrets` | gitleaks over the whole history; needs a binary or Docker |
| **Everything** | **`npm run gates`** | **all seven CI gates, in about eight minutes** |

### react-hooks/exhaustive-deps is an error, not a warning

A missing dependency froze `editingEnabled` in the mappings grid's column
memo, leaving libraries that *are* permitted to edit with a permanently
disabled Edit action. It took an e2e test to find; it should have taken a
lint run.

The rest of `eslint-plugin-react-hooks` v7 — its `recommended-latest` set — is
the React Compiler rule family, and it reports fourteen further findings here.
Three of them are `react-hook-form`'s `watch()` being flagged as
compiler-incompatible, which has no fix short of changing the form
architecture. **A gate that can only be satisfied with suppressions is not a
gate**, so that family stays off until it can be turned on and left green.

## Readiness is not the assertion

Every axe surface declares a `ready` step, and those steps use a **longer
timeout** than the default five seconds. The axe assertion itself does not.

The distinction matters because they fail for different reasons. A `ready` step
that times out is almost always contention: Playwright runs `fullyParallel`
across half the cores, and twenty Chromium instances each mounting MUI X
Premium's grid do not all paint inside five seconds on a loaded machine. That
surfaced as `element(s) not found` on `getByRole("grid")`, on a different two or
three surfaces every run, and vanished entirely at `--workers=1`.

Raising the readiness timeout weakens nothing. The grid still has to appear and
every axe rule still runs; the gate simply stopped reporting the machine.

CI never saw it, because `playwright.config.ts` sets `workers: 1` there. That is
the shape of the whole problem: a flake only the person running it locally sees
is the kind people learn to re-run rather than read.

## Four workers, not sixteen

`workers` is capped at 4 locally (1 in CI). Left unset, Playwright uses half the
cores — sixteen on a 32-core machine — and each one is a Chromium mounting MUI X
Premium against a route mock. Measured on one afternoon, on the same commit,
with nothing changed but the number:

| Workers | Result |
|---|---|
| 16 (the default) | 43–49 of 79, a different set each run |
| 4 | 79 of 79, twice |
| 1 | 79 of 79 |

The failures are always `element(s) not found`, which reads as the application
failing to render. It is not: it is the machine. The 43 was measured with the
branch's own changes stashed, so it was not a regression in those either.

Four is a balance, not a magic number — about three minutes against the
default's one, on the runs where the default works at all. Raise it if your
machine is idle.

## A green suite that is not green

Two failure modes, both observed in this estate, and each looks nothing like its
cause.

**A cold build inside `webServer.timeout`.** The command is
`npm run build && npm run preview` with a 120s budget. A cold `tsc && vite build`
takes most of that, so under load the preview never starts and *every* spec
fails with "element(s) not found" — a convincing impression of a broken
application. `netstat` is the tell: nothing LISTENING, only `SYN_SENT`. Run
`npm run build` first.

**A failure count that changes between runs** is not a defect in the diff.
Confirm with `--workers=1` before believing it.

## The accessibility gate

`e2e/accessibility.spec.ts` is where WCAG 2.2 AA is enforced rather than
asserted: zero axe violations on every listed surface, in **both** colour
schemes, because a palette that passes in light routinely fails in dark. It
also asserts axe's *incomplete* results, minus a small documented set that axe
cannot decide.

Automated rules catch roughly a third of WCAG failures, so this is a floor and
not a certificate — keyboard completeness, focus order and announcement still
need a person. What it guarantees is that no change silently reintroduces a
contrast, name, role or landmark failure.

Adding a page means adding it to `PAGES`. That is the whole cost, deliberately,
because a gate people route around is worse than no gate.

### Checks axe cannot decide

axe reports an *incomplete* result separately from a violation, and the gate
asserts both — a dangling `aria-labelledby` lands in `incomplete`, which is how
five of them survived a green gate that read `violations` alone.

A rule in `UNDECIDABLE` is filtered out of **incomplete only**. It still fails
the gate when axe can decide it, so listing one is not switching it off. Each
has to name the test that decides it instead:

| Rule | Why axe cannot decide | What decides it |
|---|---|---|
| `color-contrast` | it cannot resolve a ground behind MUI's elevation gradient, so it fires on every Paper | `tests/themeContrast.test.ts`, which computes ratios from the tokens rather than sampling pixels |
| `aria-hidden-focus` | with a Dialog open, MUI marks `#root` `aria-hidden` and **not** `inert`; axe asks whether those elements are "tabbable in the current state", which is a keyboard question | `e2e/cleanup.spec.ts` presses Tab ten times and asserts focus never leaves the dialog |

Both were measured before being listed. For the second: twelve presses of Tab
with the cleanup dialog open never reached the grid behind it, so the focus
trap holds and the `aria-hidden` is honest.

### Revealing a page before scanning it

Surfaces with content behind an `IntersectionObserver` are scrolled until a
named locator exists, **polled rather than stepped a fixed number of times**.

A fixed step count is open-loop, and the reveal runs the instant `page.goto`
resolves: under parallel load the document at that moment is shorter than the
viewport, so every step is spent against a page with nothing to scroll, the
panels mount below the fold afterwards, and no observer ever fires. The gate
then scanned the KPI header and the trend chart alone — eleven headings out of
twenty-five — and reported no violations over the fifteen panels it exists to
cover. Observed at ten concurrent workers; CI at `workers: 1` rendered fast
enough to hide it.

Polling costs nothing while the page is still empty and starts doing work the
moment there is any. One viewport per pass, not a jump to the bottom: an
observer whose sentinel never crosses the viewport never fires, and the
interval is what gives each newly mounted panel a frame to paint and a fetch to
land.

The locator used is the **last** panel, and one that renders unconditionally —
a panel that hides itself when empty could be satisfied vacuously.

## The harness

Every spec imports `test` and `expect` from `e2e/fixtures/test.ts` rather than
from `@playwright/test`, so that:

- runtime config is always injected, and no spec can accidentally reach a real
  host or has to remember the boilerplate;
- signing in, mocking and choosing a colour scheme are one call each, in the
  order the app requires — all of them install init scripts, so they must run
  before the first navigation;
- the accessibility assertion is the same assertion everywhere, which is what
  makes it a gate rather than a habit.

Adding a spec should mean writing assertions, not wiring.

### Mocking

GraphQL dispatches on **`operationName`** — the name in the `gql` template, not
the exported constant. Getting that wrong produces a handler that never matches
and a page that never renders. The statistics API is REST and dispatches on the
path segment after `insights/`, mirroring it.

**An unmocked call is aborted, not continued.** The fake API host does not
resolve, so continuing means a 30-second DNS wait per call; aborting fails the
query immediately. The application's own handler turns a failed fetch into a
redirect to `/networkError`, so a spec that misses an operation lands there
rather than on the page it meant to test — that is the symptom to recognise.

**The statistics defaults are populated rather than empty**, on purpose. An
empty response renders the "no data" placeholder, which would let the
accessibility gate pass without ever drawing a chart — and chart series
contrast in dark mode is exactly the kind of failure the gate exists to catch.

## Base-path specs

The base belongs to exactly one owner: TanStack Router. It strips the base off
`window.location` on the way in, so `useLocation().pathname` is `/requesting`,
and adds it back on the way out, so `<Link to="/requesting">` renders
`href="/dcb-admin-for-libraries/requesting"`.

Any code that prefixes the base itself before handing a value to `to`, or that
compares a base-prefixed string against `pathname`, counts the base twice. That
produced a doubled segment and a "Not Found" on click, and a tab strip with no
indicator because nothing ever matched.

`e2e-base-path/navigation.spec.ts` asserts **literal deployed paths** for that
reason: a helper that built the expected URL from the same base string would be
capable of doubling it too, and would agree with the bug.

## The translation-key gate

i18next does not throw on a missing key — it renders the key itself, so
`ui.data_grid.export_all_csv` appears on the export menu in front of a
librarian. It type-checks, it lints, and it only shows up if someone happens to
open that screen. `tests/translationKeys.test.ts` is the only thing that
catches it.

Its limits are deliberate: literal keys only, since `t(`a.${b}`)` cannot be
checked statically; a call carrying an inline English default is satisfied,
because it renders correct text and is a coverage question for
`npm run i18n:missed` rather than a broken screen; and comments are stripped
first, so a key inside commented-out code is not a finding.

## The route error boundary

`e2e/route-error.spec.ts` fails a route chunk on purpose. That is not a
contrivance: `autoCodeSplitting` gives every route its own chunk, so a stale
client left open across a deploy asks for a hashed filename the server no
longer has, and the boundary is what stands between that and a white screen.

It is also the only route-level throw this app can produce on demand. There are
no route loaders outside insights, and every `validateSearch` schema uses
`.catch()`, so a hand-typed URL cannot crash a route either. That is by design;
it just means the chunk is the honest way in.

## Preview ports

Every gate here runs against a `vite preview`, and Playwright's
`reuseExistingServer` is on whenever `CI` is not set. That option does what it
says: if something is already listening on the port, it does **not** start a
server, it uses that one. Three front-end repos in this workspace all defaulting
to 4173 and 4174 therefore meant a preview left running by one repo silently
served another repo's test run.

That is not hypothetical. It produced the discovery UI's suite running against
`dcb-admin-for-libraries` and redirecting to that app's Keycloak client; a
bootloader gate reporting 1 of 4 tests because it met a root-based build where
it needed a prefixed one; and a Lighthouse run reporting 9753ms against 4147ms,
which reads exactly like a performance regression. Each cost a false diagnosis
first.

So the number says which repo and which gate — `41<gate><repo>`:

| | e2e | bootloader | Lighthouse | base-path |
|---|---|---|---|---|
| `dcb-admin-ui` | 4173 | 4183 | 4193 | — |
| **this repo** | **4174** | **4184** | **4194** | **4204** |
| discovery UI | 4175 | 4185 | 4195 | — |

The e2e column is the allocation: one memorable primary port per repo. The
bands exist because a repo has more than one gate — this one uses all four — so
one port per repo would have left a repo's gates colliding with *themselves*.
That is the harder failure to spot, because it does not look like a collision:
the second gate simply measures whatever the first one left running, and
reports a number that is wrong rather than an error that is obvious.

**Always `--strictPort`.** Without it vite does not fail when a port is taken,
it quietly increments to the next free one — which is a neighbour's, and
defeats the allocation entirely.

Adding a gate means taking the next free band for this repo's digit and adding
it to the table above *and* to `doctrine/fragments/workspace.md`.

## The Lighthouse toolchain is pinned by hand

`package.json` carries an `overrides` block that exists for one reason:
`@lhci/cli@0.15.1` is the latest release, its last commit to `main` was
2025-06-26, and every advisory `npm audit` reported here came through it. It
pins `lighthouse: 12.6.1` exactly, so there is no version of it to upgrade to.

| Override | Replaces | Why |
|---|---|---|
| `tmp: ^0.2.7` | `0.1.0` under lhci, `0.0.33` under `external-editor` | blanket, because the nested copy is what the path-traversal advisory names; overriding it dedupes both onto one `0.2.7` |
| `@lhci/cli > uuid: ^11.1.1` | `8.3.2` | scoped, because `uuid` is also a direct dependency at `14.0.2` and a blanket override is `EOVERRIDE` |
| `@lhci/cli > @puppeteer/browsers: ^3.2.3` | `2.13.2` | 3.x replaced `extract-zip` with `modern-tar`. `extract-zip@2.0.1` is both the latest release and the vulnerable one, so this is the only way to clear those two advisories |

Upstream already accepts all three — PRs
[#1139](https://github.com/GoogleChrome/lighthouse-ci/pull/1139),
[#1140](https://github.com/GoogleChrome/lighthouse-ci/pull/1140) and
[#1141](https://github.com/GoogleChrome/lighthouse-ci/pull/1141), open since
April 2026 with nobody merging them. **Delete this block the day an `@lhci/cli`
ships with them in**, and re-check
[#1136](https://github.com/GoogleChrome/lighthouse-ci/issues/1136) (Lighthouse
13 support) while you are there.

The `@puppeteer/browsers` line is a major bump of a dependency
`puppeteer-core@24` never declared compatibility with, so it is the one to
re-verify after any change here. `npm run lighthouse` is that check:
`lighthouserc.cjs` points `CHROME_PATH` at Playwright's Chrome, which is why
puppeteer's own browser-resolution path is barely exercised and the bump is
survivable at all. Green means zero `error`-level assertions in
`.lighthouseci/assertion-results.json` — the two `warn` ones are warnings by
design.

## Names that only mean something here

`npm run naming` reads `naming-gate.json` and fails on a name a reader outside this
workspace cannot resolve. It runs in CI as `verify_naming`, over the tracked tree and,
where `origin/main` resolves, the commit messages on the branch.

It exists because this repository is **mirrored to a public GitHub remote**, and the
shared doctrine used to say to name the components in prose and comments. That rule put
an unannounced product name into nine lines across eight files, and would have put it
into a merge commit subject as well.

Three rules ship. `product-codename` is at zero and stays there. `plan-reference` was
the interesting one: thirteen occurrences of `§V-11.1` and its siblings, section numbers
from a planning document that lives in the workspace and ships to nobody. None needed a
replacement - every one sat beside prose that already said what it meant, so the
reference told a reader who could resolve it something they already had, and everyone
else nothing. `plan-document` catches a `*_PLAN.md` pointer and has never fired; it is
here because the workspace plans are where the other two rules’ names come from.

**The `.graphqls` files are excluded from `plan-reference` and hold thirteen more.** They
are copied from dcb-service and re-taken whenever that contract moves, so editing their
comments here is drift that the next copy silently reverts. That fix belongs upstream.

**Each rule says where it applies**, and the first CI run is what forced that. The gate
failed on the commit message that introduced it, because that message quotes the
references the rule catches - and more importantly because the shared doctrine sends a
plan’s section numbers to "`docs/`, an ADR, or **the commit message**". A gate failing
on the third would contradict the rule it exists to enforce. So `plan-reference` and
`plan-document` are `"scope": ["files"]`, and `product-codename` keeps both: a product
name in a commit message reaches the mirror exactly as code does, and that is where the
leak this gate was written for actually was.

**Three ways out, narrowest first.** Use the narrowest that fits:

1. `naming-gate:allow <rule-id> - <reason>` on a single line, in a file that is otherwise
   checked. Names the rule, so switching one off leaves the others on. **In a commit
   message it applies to the whole commit**, as a trailer: a line of prose cannot carry a
   marker without mangling the sentence, and a message that is already pushed cannot be
   corrected without rewriting published history. A gate whose only remedy is a force
   push is one people turn off.
2. A rule’s own `exclude`, for a class of file it cannot speak to - `*.graphqls` is
   excluded from `plan-reference` because those files are copied from dcb-service.
3. `exemptPaths`, for a file that is *about* the rules: this document, the config, the
   checker. They cannot explain or implement a rule without containing what it forbids,
   and making them fight the gate on every edit is how an exemption ends up spelled
   `--no-verify` instead.

**Every one of them prints on every run**, green or red. An exemption nobody sees is one
nobody reviews, and this list getting longer is the signal that a rule is wrong rather
than the code.

## Running the gates locally

`npm run gates` runs every `verify_*` job the pipeline runs, with the same commands,
and prints a summary. `--only naming,static` and `--skip e2e,performance` narrow it;
`--list` shows the names. It continues past a failure so one run tells you everything
that is broken, and exits non-zero if any gate failed.

```
  PASS  naming           0s  (verify_naming)
  PASS  static          64s  (verify_static)
  PASS  secrets         30s  (verify_secrets)
  PASS  performance    230s  (verify_performance)
  PASS  e2e             93s  (verify_e2e)
  PASS  base-path       45s  (verify_base_path)
  PASS  ki-bootstrap    35s  (verify_ki_bootstrap)
```

**Two gaps closed when this was written, and both had already cost a red pipeline.**
`npm run naming` ran without `--messages`, so the commit-message half - the half that
failed in CI twice - never ran locally at all. It now carries the same range CI uses.
And `verify_secrets` had no local path of any kind, because gitleaks is not an npm
package: the runner uses a `gitleaks` binary if there is one, Docker if the daemon is
up, and otherwise reports **SKIP** rather than counting a gate it did not run.

Three things differ from CI, deliberately:

- **Order.** CI runs these in parallel; this runs them fastest first, so a failure
  surfaces in seconds rather than after the browser gates. Nothing depends on anything
  else, so the order is a convenience.
- **No `npm ci`.** Every CI job starts with one. Locally that would delete and rebuild
  `node_modules` before every run; if the lockfile has moved, run it yourself.
- **No SARIF report.** CI writes `gitleaks.sarif` as a job artifact. Locally that is a
  file nobody wants to find in `git status`, so the report flags are left off.

On Windows, `npm` and `npx` are `.cmd` shims and need a shell; `node`, `docker` and
`gitleaks` must not have one, because a shell re-joins the arguments and this
repository’s path contains a space. That broke the Docker volume mount on the first run.
