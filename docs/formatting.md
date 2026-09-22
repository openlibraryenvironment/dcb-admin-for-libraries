# Formatting dates and numbers

`src/helpers/formatters.ts` wraps `Intl`. This is what it is for, and — more
usefully — what it is deliberately not for.

## The locale is the browser's, not i18next's

The interface language is pinned to English (`docs/theming.md` §8). The way a
date or a decimal separator is written is a **regional** convention rather than
a language one, and the two do not travel together: a librarian in Sheffield
reading an English interface still expects `22/09/2026`, and `Intl` asked for
`"en"` will hand them `9/22/2026`.

So the formatters pass `undefined`, which is how `Intl` is told to use the
browser's own locale. When a real second language ships, this is the file that
decides whether the two should be joined up.

Every function takes an explicit locale as its last argument. Nothing in the
application passes one; `tests/formatters.test.ts` does, because a test that
asserts whatever the machine running it happens to be set to asserts nothing.

## What changed, and why each one was wrong

| Was | Now | The defect |
|---|---|---|
| `` `${currencySymbol}${amount}` `` | `formatCurrency(amount, currency)` | The symbol does not always come first. `1.234,00 €` is not `€1.234,00`. |
| `` `${n.toFixed(1)}%` `` | `formatPercent(n)` | `fr-FR` puts a narrow no-break space before the sign; string concatenation cannot. |
| `n.toLocaleString()` | `formatNumber(n)` | Correct already, but built a fresh formatter per call — these run once per grid cell. |
| `dayjs(d).format("dddd, MMMM D, YYYY h:mm A")` | `formatLongDateTime(d)` | An American long date, hardcoded, shown to every reader. |
| `Number(x).toFixed(5)` | `formatNumber(x, {…: 5})` | A `.` decimal separator for a reader whose region uses `,`. |

The cost store held a currency **symbol** — a literal `"£"`, with a setter
nothing ever called, so every consortium's cost-avoidance figure was in pounds.
It now holds an ISO 4217 **code**, validated on the way in and on rehydrate,
because `Intl` throws rather than degrades when the currency is missing and
that would take the whole Insights page down for anyone who had used it before
the change.

Nothing sets the currency yet. Where a consortium's currency should come from —
`dcb-service`, or a setting on this page — is an open product question, not an
oversight to be quietly defaulted.

## Timestamps: ISO ordering, a named clock, and the reader chooses it

`formatTimestamp` renders `2026-09-01 09:15 UTC`. Three decisions in one line.

**ISO ordering, locale pinned to en-GB.** These are administrative and
diagnostic — created, updated, next scheduled poll, and the audit trail at
millisecond precision. They are read beside `dcb-service`'s own logs and sorted
by eye, so `09/01` meaning different dates to different readers would be worst
in exactly the place where people compare notes. This is the deliberate
exception to the browser-locale rule above.

**The zone is always named.** It never was. Every timestamp was rendered on the
reader's own clock and labelled with nothing, so a librarian in Sheffield and
one in Missouri read different numbers for the same event and neither had any
way to know.

**Which clock is a display preference**, beside text size and typeface: "My
device's time zone", or "UTC, as the service records it". It lives in
`useThemeStore`, validated on write and on rehydrate like the rest.

`service` means **UTC**, not a consortium time zone. `dcb-service` returns
`2026-09-01T09:15:00Z`, and nothing in the capabilities payload or the runtime
config names a zone. If one ever appears, that becomes a third option and this
is the file that changes.

### How a grid sees the preference

A column's `valueFormatter` is a plain function called per cell, so it cannot
use a hook. It reads `currentClock()` from the store, and `DataGrid.tsx`
subscribes to the preference and **remounts** the grid on change: MUI X does
not treat a formatter's output as part of a cell's identity, so a re-render
alone leaves the old text on screen. The cost is the grid's scroll position, on
a setting nobody changes twice.

It is also what the CSV export writes, because `valueFormatter` produces both —
so an export now says which clock its times are on.

## What stays as it is

**`dayjs` stays.** MUI X's date pickers take it as their adapter, so it is not
a dependency the formatters can retire — only one we stop using for display.
