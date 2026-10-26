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
| Bundle | `npm run budget:build` | fails if what every page loads first is over budget; reports what each route and on-demand feature adds |
| Lighthouse | `npx lhci autorun` | transfer, CLS and the category scores |
| Naming | `npm run naming` | no name that only means something inside this workspace |
| Secrets | `npm run gates -- --only secrets` | gitleaks over the whole history; needs a binary or Docker |
| Dependencies | `npm run gates -- --only dependencies` | no high or critical advisory in production dependencies; every production licence on the allow-list in `scripts/check-licences.mjs` |
| Image | `npm run gates -- --only image` | the production Docker image builds; needs Docker |
| **Everything** | **`npm run gates`** | **all nine CI gates** |
| Release report | `npm run report`, after the gates | nothing: it explains them. See "The release report" |

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

## What the bundle budget measures

`scripts/check-bundle-budget.mjs` reads the build manifest and measures gzipped scripts and
stylesheets against `bundle-budget.json`. It prints a report and writes it to
`reports/bundle-budget.md`, which CI keeps as an artefact of `verify_performance`.

| Budget | Measures | When over |
|---|---|---|
| `firstLoad` | what every page loads before its own route code: the entry, the app shell it boots, and their static imports | **fails the build** |
| `routes` | what a page adds to that: its route file, the layout routes above it, and their static imports | reported |
| `onDemand` | what a feature adds to the first load, from its entry point: Excel export, each translation catalogue, the saved filters dialog | reported |
| the total | everything the build emits | printed, never budgeted |

Routes and features are named by their source file, not by the chunk the bundler happens to
name, so a regrouping does not move a budget. A route or feature that is no longer built is
reported, so a budget nobody checks does not linger.

**Why only the first load fails.** It is what every user pays, `/login` included, and it is
where both of 2.0's real regressions landed. Route and feature budgets are a report: a route
that grows by tens of KB shows as over in every run until someone cuts it or argues a new
number, but it does not hold up an unrelated change. The total is not a budget at all. It
counted the Excel library, which only an export loads, and it failed a change that took 65 KB
off every grid page because splitting code adds a little to the total.

**The numbers.** `firstLoad` is a held ceiling, 252,100: what was measured when the
translation catalogue left the first load, plus 2%. Routes and features were set on
16 October 2026 to what was measured plus 5%, rounded up to 100: room for strings and
dependency patches, none for tens of KB. Never raise one to make a build pass or to sit just
above it: cut the weight, or write the argument in `bundle-budget.json` and the commit.

**Run it locally with `npm run budget:build`.** It builds as CI does, with `BUNDLE_BUDGET=1`
and `VITE_PUBLIC_URL=/`, then measures. `BUNDLE_BUDGET=1` makes `vite.config.ts` ignore `.env`,
whose `VITE_` values are inlined into the bundle: a local `.env` adds about 450 bytes, and a
`dist/` left by the e2e build has it. `npm run budget` measures whatever is already in `dist/`.
The performance gate (`npm run gates -- --only performance`) builds and measures the same way.

**The first-load budget was added after both 2.0 regressions slipped past a total-only budget.**
The Insights dashboard joined `/login`'s initial load (+190 KB) through a pending component
that shared its module, and every grid's column definitions joined it (+40 KB) through
`validateSearch`. The total barely moved in either case, because the code moved rather than
grew. Lighthouse caught the first one only as a slower LCP. A route file's options, its
`validateSearch` and `beforeLoad`, load with the route tree. Its `loader` and its components
are split out with the page (`codeSplittingOptions` in `vite.config.ts`).

**The 2.0 evaluation, 12 October 2026.** The total fell from 1,252,000 bytes to 931,176, and
the initial load from 305,377 on `main` to 258,099, with no feature removed:

- `exceljs` (276 KB) and `rasterizeHTML` (27 KB) were in the build but could never load:
  they serve Excel export and chart image export, and this app offered neither.
  `vite.config.ts` aliases them to a stub that throws (`EXCLUDED_PACKAGES`), and
  `tests/excludedFromBuild.test.ts` fails if either feature is switched on.
  Excel export has since returned through the export wizard, so `exceljs` is built again
  as a chunk of its own that only an Excel export loads ([export.md](export.md));
  `rasterizeHTML` stays out.
- Eight font subsets were inlined as base64 into the stylesheet every page blocks on
  (22 KB). Fonts are no longer inlined; a subset loads only on a page that draws its
  characters.
- Route loaders loaded with the route tree, which put `axios` and the Insights statistics
  client on every page (36 KB). They now load with their page.

Weight that remains and could go later: `axios` (18.6 KB, could be `fetch`), and `yup` beside
`zod` (24.5 KB, two validation libraries).

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
schemes, because a palette that passes in light routinely fails in dark, and
again at 320 CSS px, where it also fails on a page that scrolls sideways or cuts
content off at its left edge (WCAG 1.4.10). It
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
| `aria-valid-attr-value`, `controlsWithinPopup` only | axe 4.13 marks every `aria-controls` on an `aria-haspopup` element for review whether or not the popup exists: an open column menu's button always lands here | decided by `e2e/fixtures/axe.ts` itself: the node is dropped only when the element it controls is in the page. The rule's other findings still count |

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

### Documents only sent behind a flag

`schemaConformance.test.ts` validates every GraphQL document in the app against
`schema.graphqls`. A document that is only ever sent when a feature flag is on is
**excluded** from the narrower passes rather than skipped, and `FLAG_ONLY` names the
flag beside it.

The difference matters: excluding one is a claim that a route guard stops it being
emitted on an older deployment, and naming the flag is what makes the claim reviewable.
A silent skip would be a hole in the gate; this is a documented door.

Announcements are the whole of it today — see [announcements.md](announcements.md).

## Which pipeline runs what

`workflow:rules` in `.gitlab-ci.yml` makes one pipeline per event, and every job
takes one of two rule sets, `.rules.quick` or `.rules.gate`, or rules of its own
that say why.

| Pipeline | Runs |
|---|---|
| A push to a branch with no merge request | `quick`: naming, static and secrets |
| A push to a branch with an open merge request | nothing: the merge request pipeline checks it |
| **A merge request** | **the merge gate**: every check and the build; the image only when its files change. One that changes only documentation, Markdown or unit tests skips the browser gates, the speed checks and the build |
| `main` | the merge gate again, then the dev deploys |
| `release` | the merge gate, the image and the release report, then the release and its deploys |
| A schedule | the dependency audit and the flake hunt; nothing that releases or deploys |
| Run by hand with `ON_DEMAND_REPORT` set to `true` | every check, the image and the release report; nothing that releases, publishes or deploys |

A skipped check is never the only check of a change: `main` and `release` run the
whole gate whatever changed. The list that decides it is `&app_paths`, and
`tests/ciChangePaths.test.ts` fails on a tracked file that list does not account
for, so a new kind of file runs the gates until someone decides otherwise.

The browser tests and the speed checks test one build, made by `verify_build`
and handed to them as an artifact; `USE_EXISTING_BUILD` tells
`playwright.config.ts` and `scripts/preview-for-lighthouse.mjs` to serve it
rather than build their own. Locally, nothing sets it and each builds as before.
The base-path and bootloader gates still build their own: each tests a
different base.

"Pipelines must succeed" judges a merge request by its merge request pipeline, so
that pipeline carries the whole gate. `main` runs it again because, on GitLab Free,
two merge requests can each pass and still break `main` together; merged-results
pipelines and merge trains, which would catch that first, are Premium.

A rule with no `if` matches a merge request pipeline as well as a branch one,
which is how `verify_image` once made a merge request pipeline of one job.

## Nightly

Two jobs run only in a scheduled pipeline:

- **`verify_dependencies`**, because an advisory can land against code nobody
  has changed, and would otherwise be found by the next merge request.
- **`nightly_flake_hunt`**, the browser suite `FLAKE_REPEAT` times over (3 by
  default) with no retries. In a merge request `retries: 2` turns a test that
  passes only sometimes into a pass; here it fails, and the report names it.

A failed scheduled pipeline is emailed to the schedule's owner. The schedule
itself is set up in GitLab, not in this repository: **CI/CD > Schedules > New
schedule**, target branch `main`, and a nightly time such as `0 2 * * *` in
Europe/London. `FLAKE_REPEAT` can be overridden there as a schedule variable.

## The release report

`reports/release-report.html` says what every check in a pipeline found, for a
reader who does not read code: a verdict, each check with what it checks and why
it matters, and accessibility set out page by page and criterion by criterion.

The `report` job builds it after the verify stage, whether or not the checks
passed, on `release` and in a pipeline run on demand (below); a merge request
does not make one. Job artifacts expire, so `.releaserc.json` also attaches it to each GitLab Release, where it
stays. That copy is as visible as the release page. It is attached at the
permanent path `release-report.html`, so
`/-/releases/permalink/latest/downloads/release-report.html` on the project always
opens the latest release's report, and `/-/releases/<tag>/downloads/release-report.html`
a given one. `tests/releaseConfig.test.ts` fails if that path changes.

It reads what the checks leave in `reports/`: how each job ended
(`reports/status/`, written by `.records_status`), Playwright's JSON report, the
JUnit files, `bundle-budget.json` and `.lighthouseci/`. To make one locally, run
`npm run gates` and then `npm run report`; anything a gate did not produce is
reported as not run.

What it says comes from beside the checks themselves, so it changes when they do:

- **Each accessibility test** says what it checks, and the WCAG success criteria
  it is evidence for, through `covers()` in `e2e/fixtures/coverage.ts`.
  `tests/accessibilityCoverage.test.ts` fails on one that does not.
- **Each axe scan** attaches every rule's outcome and the criteria the rule
  tests, which is how a criterion is reported as checked automatically.
- **Each pipeline check** is explained in `scripts/gates.json`.
  `tests/gateCatalogue.test.ts` fails when a `verify_*` job has no entry.
- **A criterion nothing automated checks** is reported as assessed by hand, with
  the conformance the VPAT states for it, read from that document's tables, so
  a VPAT row must open with its criterion in bold, linked, and give its
  conformance in the next cell.

`e2e/release-report.spec.ts` holds the report to WCAG 2.2 AA in both colour
schemes: it is offered as accessibility evidence.

### The report on demand

Every release pipeline makes the report and attaches it to the release. To make
one at any other time, for a bid, a customer or a PO review, run a pipeline by
hand:

1. In GitLab, open **Build > Pipelines** and choose **Run pipeline**.
2. Choose the branch, or a release tag.
3. Set `ON_DEMAND_REPORT` to `true`. The form offers it with its description.
4. When the pipeline finishes, the `report` job's **Release report** artifact is
   the page. It expires after a month like any artifact, so press **Keep** on the
   job to keep it.

Such a run includes every check and the image, and nothing that releases,
publishes or deploys, even on `release`. `tests/onDemandReport.test.ts` fails if
a job that ships does not exclude it, or if the report would run in any other
pipeline. A tag made before this change carries the older pipeline file, so it
cannot be reported on this way.

Set the variable only on a pipeline you run by hand. Set as a project variable,
it would turn every pipeline into a report run, and nothing would ship.

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

A key must resolve to **text**. One that names a branch of the tree renders
i18next's "returned an object instead of string" - which is what a progress
bar on the requesting page carried as its accessible name. An inline default
does not excuse a branch, because i18next never reaches the default; only
`returnObjects` asks for one on purpose.

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
it to the table above *and*, if you are using the K-Int Agent Harness for
AI-assisted development, to `openrs-harness-pack/instructions/workspace.md`.

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

The plan prefix list is `N`, `R` and `V`. It began as `N` and `V` only, and nineteen
`R-17`/`R-19` references sat in fourteen files under a green gate until the prefix was
added; widening it to any capital letter matched those nineteen and nothing else.

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
  PASS  image           90s  (verify_image)
```

**Two gaps closed when this was written, and both had already cost a red pipeline.**
`npm run naming` ran without `--messages`, so the commit-message half - the half that
failed in CI twice - never ran locally at all. It now carries the same range CI uses.
And `verify_secrets` had no local path of any kind, because gitleaks is not an npm
package: the runner uses a `gitleaks` binary if there is one, Docker if the daemon is
up, and otherwise reports **SKIP** rather than counting a gate it did not run. The
`image` gate, `docker build` of `docker/production/Dockerfile`, skips the same way
without a daemon. Nothing else builds the image, and it once stopped at `npm ci` while
every other gate passed; CI runs it on the `release` branch, and wherever `docker/`,
`.dockerignore` or the package files change.

**The runner sets `CI=1`**, because the pipeline has it set and both Playwright configs
read it: workers 1 rather than 4, retries 2 rather than 0, and `reuseExistingServer`
off so each gate starts and stops its own preview. Without it, running the gates back to
back produced **failures that pass on their own** - four workers racing on a machine
still busy from the Lighthouse run before them, with no retry to absorb it. That is the
flakiness this document already warns about, met from a new direction.

The cost is CI’s own blind spot: `retries: 2` turns a racing spec green. To hunt one,
run `npx playwright test --workers=1` directly rather than through the runner.

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
