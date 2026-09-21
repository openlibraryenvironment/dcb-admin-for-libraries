/**
 * Reduced motion, as global CSS rather than a theme value.
 *
 * Two rules, because there are two ways to ask for it: the operating system's
 * `prefers-reduced-motion`, which applies unless the user has explicitly chosen
 * full motion, and the user's own choice, which applies whatever the OS says.
 * A preference has to be overridable in BOTH directions - otherwise somebody on
 * a machine that is not theirs is stuck with someone else's setting.
 */
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

/**
 * `!important` is correct here and nowhere else in this application: MUI's
 * transition components write `transition-duration` INLINE at runtime, and no
 * stylesheet rule beats an inline declaration.
 *
 * 0.01ms rather than 0, because a zero duration skips `transitionend` and MUI's
 * own callbacks wait on it - a Dialog that never fires it never unmounts.
 */
export const motionStyles = {
	"@media (prefers-reduced-motion: reduce)": reduceUnder(NOT_FULL),
	...reduceUnder(FORCED),
};
