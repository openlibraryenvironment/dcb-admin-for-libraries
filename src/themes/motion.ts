// Reduced motion, as global CSS rather than a theme value. Why two rules, and
// why "match my device" writes no attribute: docs/theming.md §7.
const REDUCE = {
	animationDuration: "0.01ms !important",
	animationIterationCount: "1 !important",
	transitionDuration: "0.01ms !important",
	scrollBehavior: "auto !important",
} as const;

/** The user has not chosen full motion, so the OS preference governs. */
const NOT_FULL = 'html:not([data-motion="full"])';
/** The user has chosen reduced motion, whatever the OS says. */
const FORCED = 'html[data-motion="reduced"]';

const reduceUnder = (root: string) => ({
	[`${root}, ${root} *, ${root} *::before, ${root} *::after`]: REDUCE,
});

/** `!important` and 0.01ms are both deliberate: docs/theming.md §7. */
export const motionStyles = {
	"@media (prefers-reduced-motion: reduce)": reduceUnder(NOT_FULL),
	...reduceUnder(FORCED),
};
