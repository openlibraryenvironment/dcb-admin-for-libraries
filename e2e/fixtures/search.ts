import type { Page } from "@playwright/test";

/**
 * The shared index search API.
 *
 * REST against `${VITE_DCB_SEARCH_BASE}/search/instances`, which is how the
 * requesting page - the only surface a read-only user has - gets its results.
 *
 * Populated by default, for the reason DEFAULT_STATS is: an empty response
 * renders the "no results" line, which would let the accessibility gate pass
 * over the result cards it exists to scan.
 */
export interface SearchMock {
	totalRecords: number;
	instances: Record<string, unknown>[];
}

export const DEFAULT_SEARCH: SearchMock = {
	totalRecords: 2,
	instances: [
		{
			id: "aaaaaaaa-0000-4000-8000-000000000001",
			title: "Middlemarch",
			description: "A study of provincial life",
			publicationDate: "1871",
			sourceTypes: ["Book"],
			contributors: [{ name: "Eliot, George" }],
			isbns: ["9780141439549"],
		},
		{
			id: "aaaaaaaa-0000-4000-8000-000000000002",
			title: "Bleak House",
			description: "A novel",
			publicationDate: "1853",
			sourceTypes: ["Book"],
			contributors: [{ name: "Dickens, Charles" }],
			isbns: ["9780141439723"],
		},
	],
};

export async function mockSearch(
	page: Page,
	override?: Partial<SearchMock>,
): Promise<void> {
	const body = { ...DEFAULT_SEARCH, ...override };
	await page.route("**/search/instances**", (route) =>
		route.fulfill({ json: body }),
	);
}
