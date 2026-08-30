/**
 * The palette token to use when GOOD/BAD is carried by coloured text.
 *
 * Returns a THEME token, not a mode-dependent choice, because this app runs MUI
 * with `cssVariables` and `colorSchemes` (theme.ts) - so `theme.palette.mode` does
 * NOT track the active scheme, and reading it hands dark mode the light values.
 * The colour scheme is resolved by CSS, per scheme, from the tokens defined in
 * `colorSchemes.{light,dark}.palette.primary`.
 *
 * Why custom tokens rather than success/error:
 *
 * | token                    | light: white / #ecf0f3 | dark: #121212 / #182c38 |
 * |--------------------------|-----------------------:|------------------------:|
 * | `success.main`           |          5.13 / **4.47** ✗ |             7.92 / 6.10 |
 * | `error.main` (red.A400)  |      **3.85** / **3.36** ✗ |         4.87 / **3.75** ✗ |
 * | `primary.outcomeGood`    |            7.87 / 6.87 ✓ |             7.92 / 6.10 ✓ |
 * | `primary.outcomeBad`     |            5.62 / 4.91 ✓ |             6.27 / 4.83 ✓ |
 *
 * The second ground is the selected-row tint, which is where the caller's own
 * library sits in the peer table - so it is exactly the row most likely to be read.
 *
 * `error.main` is `red.A400`, set explicitly for both schemes in theme.ts. No shade
 * of that ramp clears 4.5:1 on all four grounds, and at 3.85:1 against white it also
 * fails as a button ground with white text. That is a theme decision to revisit
 * separately; these tokens stop the insights panels depending on it.
 *
 * Colour is never the only signal in either panel - the peer table ranks its rows
 * and marks the caller's own in text, and the KPI delta ships an arrow glyph - so
 * this is about 1.4.3, not 1.4.1.
 */
export function outcomeTextColour(good: boolean): string {
	return good ? "primary.outcomeGood" : "primary.outcomeBad";
}
