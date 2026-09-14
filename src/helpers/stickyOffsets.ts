/**
 * How far down the page a focused element has to land to clear what is painted over it.
 *
 * This app's header is `position: static`, so the Insights subject bar is the only thing
 * covering the page as it scrolls. SC 2.4.11 fails silently when the bar's offset and
 * `scroll-padding-top` disagree, so both come from here - asserted in theme.test.ts.
 */

/** The Insights subject bar, sticky at the top of the scrollport. */
export const SUBJECT_BAR_HEIGHT = 49;

/** Where the sticky bar sits: nothing is above it. */
export const SUBJECT_BAR_TOP = 0;

/** What `scroll-padding-top` must be on a page carrying the bar. */
export const SCROLL_PADDING_TOP = SUBJECT_BAR_TOP + SUBJECT_BAR_HEIGHT;
