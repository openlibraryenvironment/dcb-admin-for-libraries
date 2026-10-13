import { describe, expect, it } from "vitest";
import {
	defaultParseSearch,
	defaultStringifySearch,
} from "@tanstack/react-router";

import { readFilter } from "@helpers/dataGrid/gridSearch";
import {
	patronRequestsGrid,
	supplierRequestsGrid,
} from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import {
	TODAY_COUNTS,
	TODAY_WINDOW_HOURS,
	todayCountQuery,
	windowStart,
} from "@helpers/today";

const SCOPES = {
	borrowed: "patronHostlmsCode:e2e-lms",
	supplied: "supplyingAgencyCode:e2e-agency",
};
const GRIDS = { borrowed: patronRequestsGrid, supplied: supplierRequestsGrid };
const SINCE = "2026-10-12T08:00:00.000Z";

/** What the grid makes of a link's search once it has been through a real URL. */
const asTheGridReadsIt = (
	scope: keyof typeof GRIDS,
	filters: unknown[],
) =>
	readFilter(
		GRIDS[scope],
		defaultParseSearch(defaultStringifySearch({ filters })),
		undefined,
	);

describe("each Today count", () => {
	it.each(TODAY_COUNTS.map((count) => [count.id, count] as const))(
		"%s: the grid it links to keeps every one of its filters",
		(_id, count) => {
			const filters = count.filters(SINCE);
			expect(asTheGridReadsIt(count.scope, filters).items).toEqual(filters);
		},
	);

	it.each(TODAY_COUNTS.map((count) => [count.id, count] as const))(
		"%s: counts exactly what that grid then asks the service for",
		(_id, count) => {
			const grid = asTheGridReadsIt(count.scope, count.filters(SINCE));
			expect(todayCountQuery(count, SINCE, SCOPES)).toBe(
				processGridFilterModel(grid, SCOPES[count.scope]),
			);
		},
	);

	it("is scoped to the grid it belongs to", () => {
		for (const count of TODAY_COUNTS) {
			expect(todayCountQuery(count, SINCE, SCOPES).startsWith(SCOPES[count.scope])).toBe(
				true,
			);
		}
	});

	it("puts what waits now outside the window, and everything else inside it", () => {
		for (const count of TODAY_COUNTS) {
			const windowed = count
				.filters(SINCE)
				.some((item) => item.operator === "luceneDateRange");
			expect(windowed).toBe(count.section !== "waiting");
		}
	});
});

describe("the window", () => {
	it(`starts ${TODAY_WINDOW_HOURS} hours before now`, () => {
		expect(windowStart(new Date("2026-10-13T08:00:00.000Z"))).toBe(SINCE);
	});
});
