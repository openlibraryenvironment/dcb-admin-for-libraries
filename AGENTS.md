<!-- Copy of CLAUDE.md in this directory. CLAUDE.md is the file to edit: Claude Code reads it natively, this copy exists for Codex and other tools that read AGENTS.md. Keep the two identical below this line. -->

# dcb-admin-for-libraries — agent notes

Library-facing administration UI for DCB. React 19, TanStack Router + Query, Vite 7, Vitest 4, GraphQL against `dcb-service`.

## Non-negotiables

1. **Correct** — the simplest code that is obviously right; surgical changes.
2. **Scales** — hundreds of member libraries, 100,000 patron requests a year. No unpaged grid, no unbounded list. State the bound.
3. **Secure by design** — no PII or credential in a URL, query string, log line or analytics event. Identity from verified claims, never client input.
4. **Accessible** — WCAG 2.2 AA is the floor, enforced by a failing axe gate, never asserted in prose.
5. **Evidenced** — name the test, gate or budget that proves the claim.

## The version trap

**This repo is on MUI 7 and MUI X 8 — not MUI 9 / MUI X 9 like `dcb-admin-ui` and `symposia-ui`.** TanStack Router is 1.12x here, not 1.17x, and TypeScript is 5.8, not 6.

Do not copy a component API, prop or import path across from either sibling repo without checking it exists in *these* versions. This is the single most likely way to break a build here, and it looks correct in review because the code is genuinely valid — somewhere else.

Read the installed types rather than writing an API from memory.

## Things you will get wrong without being told

**Releases run from the `release` branch, not `main`.** `semantic-release` is configured with `"branches": ["release"]`, publishes to GitLab, and commits `package.json`, `CHANGELOG.md` and `release-info.json` back with `[skip ci]`. Merging to `main` releases nothing; conventional-commit format is not optional, because commit messages *are* the release notes.

**GraphQL types are generated.** If you touch a `.ts` GraphQL document you MUST run `npm run codegen` and commit the regenerated types. A schema change in `dcb-service` is a full-stack change: update this consumer in the same change, or say explicitly which PR follows.

**Never `autocomplete="off"` on a credential field** — barcode and PIN fields must allow paste and password managers (WCAG 2.2 SC 3.3.8). **No `dangerouslySetInnerHTML`** — sanitise through an allow-list at the boundary. **No `page.waitForTimeout()`** in e2e — use web-first auto-waiting assertions. **No bare `invalidateQueries()`** — it re-fires every mounted query; invalidate the narrowest stale key.

**Every user-facing string goes through `react-i18next`**, including `aria-label`, error text and empty states.
