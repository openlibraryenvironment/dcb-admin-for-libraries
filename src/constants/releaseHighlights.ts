import type { LibraryFeature } from "@helpers/libraryFeatures";

/**
 * Raised by one for a release whose changes are worth a summary, with the items below
 * rewritten for it: everyone whose browser has seen an older generation is shown them once.
 * docs/release-highlights.md.
 */
export const HIGHLIGHTS_GENERATION = 1;

/**
 * A change, and the features it describes. Shown only where every one of them is switched
 * on; elsewhere What's new names the features instead, as not switched on here yet.
 */
export interface Highlight {
	/** release_highlights.items.<key>.heading and .body */
	key: string;
	needs?: readonly LibraryFeature[];
}

/** In the order shown. */
export const HIGHLIGHTS: readonly Highlight[] = [
	{ key: "home" },
	{
		key: "requests",
		needs: ["guarded_cleanup", "request_notes", "request_tags", "pickup_requests"],
	},
	{ key: "walk_up" },
	{ key: "views" },
	{ key: "accessibility" },
];

/** A read-only user's, who has only Requesting and Preferences: no Home, Insights or exports. */
export const READ_ONLY_HIGHLIGHTS: readonly Highlight[] = [
	{ key: "walk_up" },
	{ key: "views_read_only" },
	{ key: "accessibility" },
];

export const shouldShowHighlights = (seen: number): boolean => seen < HIGHLIGHTS_GENERATION;
