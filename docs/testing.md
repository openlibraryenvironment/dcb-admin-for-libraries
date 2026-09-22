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

One port per repo per gate, `41<gate><repo>`, and always `--strictPort`.
Playwright's `reuseExistingServer` is on whenever `CI` is not set, so a preview
left running by a sibling repo will silently serve this one's test run. The
allocation table is in `playwright.config.ts`.

This repo uses 4174 (e2e), 4184 (bootloader), 4194 (Lighthouse) and 4204
(base path).
