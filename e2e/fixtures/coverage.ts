import type { TestDetails } from "@playwright/test";

/** Where an accessibility test looked, so the release report can place its result. */
export interface Viewed {
	page: string;
	/** The colour scheme, or "phone width" */
	view: string;
}

/**
 * What an accessibility test checks, in a sentence for the release report's readers, and
 * the WCAG success criteria it is evidence for ("1.4.10"). An axe scan names none: the
 * report reads its criteria from the rules axe ran.
 */
export function covers(
	description: string,
	criteria: string[] = [],
	viewed?: Viewed,
): TestDetails {
	return {
		tag: ["@a11y", ...criteria.map((criterion) => `@wcag-${criterion}`)],
		annotation: [
			{ type: "covers", description },
			...(viewed
				? [
						{ type: "page", description: viewed.page },
						{ type: "view", description: viewed.view },
					]
				: []),
		],
	};
}
