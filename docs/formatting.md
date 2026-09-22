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

## What stays as it is

**`YYYY-MM-DD HH:mm` timestamps in the grids and on the detail pages.** These
are administrative and diagnostic: "date created", "date updated", "next
scheduled poll", and the audit trail at millisecond precision. They are read
next to `dcb-service`'s own logs, and ISO 8601 is unambiguous, sortable and the
same on both sides. Rewriting them regionally would make `09/22` and `22/09`
depend on who is looking, in the one place where people compare notes.

Two things about them are worth knowing rather than assuming:

- They are rendered in the **reader's local timezone** and carry no timezone
  marker. Two colleagues in different zones see different numbers for the same
  event and cannot tell. That is a real gap and it is not fixed here; this
  paragraph is the whole of its record.
- They are what the CSV export writes, because the grid's `valueFormatter`
  produces both.

**`dayjs` stays.** MUI X's date pickers take it as their adapter, so it is not
a dependency the formatters can retire — only one we stop using for display.
