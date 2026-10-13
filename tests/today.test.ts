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
	MAX_PICKUP_LOCATIONS,
	TODAY_COUNTS,
	TODAY_WINDOW_HOURS,
	WINDOWED_COUNTS,
	lastWeekOf,
	pickupHereQuery,
	todayCountQuery,
	windowStart,
} from "@helpers/today";
import {
	MAX_LOOKBACK_DAYS,
	nextVisits,
	sinceLastVisit,
} from "@helpers/lastVisit";

const SCOPES = {
	borrowed: "patronHostlmsCode:e2e-lms",
	supplied: "supplyingAgencyCode:e2e-agency",
};
const GRIDS = { borrowed: patronRequestsGrid, supplied: supplierRequestsGrid };
const SINCE = "2026-10-12T08:00:00.000Z";
const OPEN = { from: SINCE, to: null };
const CLOSED = { from: SINCE, to: "2026-10-13T08:00:00.000Z" };

/** What the grid makes of a link's search once it has been through a real URL. */
const asTheGridReadsIt = (scope: keyof typeof GRIDS, filters: unknown[]) =>
	readFilter(
		GRIDS[scope],
		defaultParseSearch(defaultStringifySearch({ filters })),
		undefined,
	);

const each = TODAY_COUNTS.map((count) => [count.id, count] as const);

describe("each Today count", () => {
	it.each(each)("%s: the grid it links to keeps every one of its filters", (_id, count) => {
		const filters = count.filters(OPEN);
		expect(asTheGridReadsIt(count.scope, filters).items).toEqual(filters);
	});

	it.each(each)("%s: counts exactly what that grid then asks the service for", (_id, count) => {
		const grid = asTheGridReadsIt(count.scope, count.filters(OPEN));
		expect(todayCountQuery(count, OPEN, SCOPES)).toBe(
			processGridFilterModel(grid, SCOPES[count.scope]),
		);
	});

	it("is scoped to the grid it belongs to", () => {
		for (const count of TODAY_COUNTS) {
			expect(todayCountQuery(count, OPEN, SCOPES).startsWith(SCOPES[count.scope])).toBe(true);
		}
	});

	it("puts what waits now outside the window, and everything else inside it", () => {
		for (const count of TODAY_COUNTS) {
			const windowed = count
				.filters(OPEN)
				.some((item) => item.operator === "luceneDateRange");
			expect(windowed).toBe(count.section !== "waiting");
		}
	});

	it("closes the window at both ends when asked to", () => {
		for (const count of WINDOWED_COUNTS) {
			expect(todayCountQuery(count, CLOSED, SCOPES)).toContain(
				`[${CLOSED.from} TO ${CLOSED.to}]`,
			);
		}
	});
});

describe("the window", () => {
	it(`starts ${TODAY_WINDOW_HOURS} hours before now`, () => {
		expect(windowStart(new Date("2026-10-13T08:00:00.000Z"))).toBe(SINCE);
	});

	it("compares with the same span a week earlier", () => {
		expect(lastWeekOf(SINCE, "2026-10-13T08:00:00.000Z")).toEqual({
			from: "2026-10-05T08:00:00.000Z",
			to: "2026-10-06T08:00:00.000Z",
		});
	});
});

describe("collections at the library's own locations", () => {
	it("are other libraries' patrons' requests, at these locations, in this status", () => {
		expect(pickupHereQuery(["loc-1", "loc-2"], SCOPES.borrowed, "READY_FOR_PICKUP")).toBe(
			'pickupLocationCode:("loc-1" OR "loc-2") AND status:READY_FOR_PICKUP AND NOT (patronHostlmsCode:e2e-lms)',
		);
	});

	it(`name at most ${MAX_PICKUP_LOCATIONS} locations`, () => {
		const ids = Array.from({ length: MAX_PICKUP_LOCATIONS + 5 }, (_, i) => `loc-${i}`);
		const query = pickupHereQuery(ids, SCOPES.borrowed, "PICKUP_TRANSIT");
		expect(query.match(/"loc-\d+"/g)).toHaveLength(MAX_PICKUP_LOCATIONS);
	});
});

describe("the last visit", () => {
	const at = (iso: string) => new Date(iso);

	it("knows no earlier visit the first time", () => {
		const visits = nextVisits(null, at("2026-10-13T09:00:00.000Z"));
		expect(sinceLastVisit(visits, at("2026-10-13T09:00:00.000Z"))).toBeNull();
	});

	it("starts from the visit before this one, and holds while the page is reopened", () => {
		const monday = nextVisits(
			{ lastSeen: "2026-10-09T16:00:00.000Z", previous: null },
			at("2026-10-12T09:00:00.000Z"),
		);
		expect(monday.previous).toBe("2026-10-09T16:00:00.000Z");

		const tenMinutesLater = nextVisits(monday, at("2026-10-12T09:10:00.000Z"));
		expect(tenMinutesLater.previous).toBe("2026-10-09T16:00:00.000Z");
	});

	it(`reaches back at most ${MAX_LOOKBACK_DAYS} days`, () => {
		const now = at("2026-10-13T09:00:00.000Z");
		expect(
			sinceLastVisit({ lastSeen: now.toISOString(), previous: "2026-01-01T00:00:00.000Z" }, now),
		).toBe("2026-09-13T09:00:00.000Z");
	});
});
