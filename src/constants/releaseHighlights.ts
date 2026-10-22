/**
 * Raised by one for a release whose changes are worth a summary, with the items below
 * rewritten for it: everyone whose browser has seen an older generation is shown them once.
 * docs/release-highlights.md.
 */
export const HIGHLIGHTS_GENERATION = 1;

/** In the order shown; each is release_highlights.items.<key>.heading and .body. */
export const HIGHLIGHTS = ["home", "cleanup", "views", "accessibility", "exports"] as const;

/** A read-only user's, who has only Requesting and Preferences: no Home, Insights or exports. */
export const READ_ONLY_HIGHLIGHTS = ["views", "accessibility_read_only"] as const;

export const shouldShowHighlights = (seen: number): boolean => seen < HIGHLIGHTS_GENERATION;
