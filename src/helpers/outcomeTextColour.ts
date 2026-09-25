/**
 * The palette token to use when GOOD/BAD is carried by coloured text.
 *
 * Returns a THEME token, not a mode-dependent choice: this app runs MUI with
 * cssVariables and colorSchemes, so `theme.palette.mode` does not track the
 * active scheme and reading it hands dark mode the light values.
 *
 * Why these rather than success/error, with the measured ratios:
 * docs/insights.md.
 */
export function outcomeTextColour(good: boolean): string {
	return good ? "primary.outcomeGood" : "primary.outcomeBad";
}
