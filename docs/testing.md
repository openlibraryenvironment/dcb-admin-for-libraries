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

## Preview ports

Every gate here runs against a `vite preview`, and Playwright's
`reuseExistingServer` is on whenever `CI` is not set. That option does what it
says: if something is already listening on the port, it does **not** start a
server, it uses that one. Three front-end repos in this workspace all defaulting
to 4173 and 4174 therefore meant a preview left running by one repo silently
served another repo's test run.

That is not hypothetical. It produced a `symposia-ui` suite running against
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
| `symposia-ui` | 4175 | 4185 | 4195 | — |

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
