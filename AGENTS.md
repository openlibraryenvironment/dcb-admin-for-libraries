<!-- Copy of CLAUDE.md in this directory. CLAUDE.md is the file to edit: Claude Code reads it natively, this copy exists for Codex and other tools that read AGENTS.md. Keep the two identical below this line. -->

# dcb-admin-for-libraries — agent notes

Library-facing administration UI for DCB. React 19, TanStack Router + Query, Vite 8, Vitest 4, GraphQL against `dcb-service`.

## Non-negotiables

1. **Correct** — the simplest code that is obviously right; surgical changes.
2. **Scales** — hundreds of member libraries, 100,000 patron requests a year. No unpaged grid, no unbounded list. State the bound.
3. **Secure by design** — no PII or credential in a URL, query string, log line or analytics event. Identity from verified claims, never client input.
4. **Accessible** — WCAG 2.2 AA is the floor, enforced by a failing axe gate, never asserted in prose.
5. **Evidenced** — name the test, gate or budget that proves the claim.

## Versions

Corrected 2026-08-30. This section previously said MUI 7 / MUI X 8 / Router 1.12x / TypeScript 5.8 and warned against copying from `dcb-admin-ui` for that reason. That is no longer true in either direction, and following it would have steered people away from APIs that are correct here.

| | this repo | `dcb-admin-ui` |
|---|---|---|
| MUI | **9.3.1** | 9.1.2 |
| MUI X (grid, charts, pickers, license) | **9.12.0** | 9.12.0 |
| TanStack Router | **1.170.31** | 1.170.17 |
| TypeScript | **6.0.3** | 6.0.3 |
| Vite | **8.2.1** | 8.1.3 |
| React | **19.2.8** | 19 |

The two admin apps are on the same generation, so an API that works in one usually works here. "Usually" is the operative word: the MUI minors differ, and MUI X 9 is where the two repos are pinned in lockstep on purpose — those packages share `x-license` and `x-internals`, and a mixed set is a runtime hazard rather than untidiness. Bump them together or not at all.

**Read the installed types rather than writing an API from memory.** That is the durable rule here, and it is not about which repo is behind: this estate runs ahead of most models' training data, so a remembered API is a hallucination risk whichever version is installed.

## Things you will get wrong without being told

**Releases run from the `release` branch, not `main`.** `semantic-release` is configured with `"branches": ["release"]`, publishes to GitLab, and commits `package.json`, `CHANGELOG.md` and `release-info.json` back with `[skip ci]`. Merging to `main` releases nothing; conventional-commit format is not optional, because commit messages *are* the release notes.

**GraphQL types are generated.** If you touch a `.ts` GraphQL document you MUST run `npm run codegen` and commit the regenerated types. A schema change in `dcb-service` is a full-stack change: update this consumer in the same change, or say explicitly which PR follows.

**Never `autocomplete="off"` on a credential field** — barcode and PIN fields must allow paste and password managers (WCAG 2.2 SC 3.3.8). **No `dangerouslySetInnerHTML`** — sanitise through an allow-list at the boundary. **No `page.waitForTimeout()`** in e2e — use web-first auto-waiting assertions. **No bare `invalidateQueries()`** — it re-fires every mounted query; invalidate the narrowest stale key.

**Every user-facing string goes through `react-i18next`**, including `aria-label`, error text and empty states.
