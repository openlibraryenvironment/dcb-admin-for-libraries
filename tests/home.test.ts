import { afterEach, describe, expect, it, vi } from "vitest";
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
	HOME_COUNTS,
	WINDOWED_COUNTS,
	comparesWithLastWeek,
	lastWeekOf,
	pickupHereQuery,
	homeCountQuery,
	homeCountsQueryOptions,
	homeHistoryQueryOptions,
	windowStart,
} from "@helpers/home";
import {
	borrowedByLibraryQuery,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import {
	MAX_LOOKBACK_DAYS,
	nextVisits,
	readVisits,
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

const each = HOME_COUNTS.map((count) => [count.id, count] as const);

describe("each home page count", () => {
	it.each(each)("%s: the grid it links to keeps every one of its filters", (_id, count) => {
		const filters = count.filters(OPEN);
		expect(asTheGridReadsIt(count.scope, filters).items).toEqual(filters);
	});

	it.each(each)("%s: counts exactly what that grid then asks the service for", (_id, count) => {
		const grid = asTheGridReadsIt(count.scope, count.filters(OPEN));
		expect(homeCountQuery(count, OPEN, SCOPES)).toBe(
			processGridFilterModel(grid, SCOPES[count.scope]),
		);
	});

	it("is scoped to the grid it belongs to", () => {
		for (const count of HOME_COUNTS) {
			expect(homeCountQuery(count, OPEN, SCOPES).startsWith(SCOPES[count.scope])).toBe(true);
		}
	});

	it("puts what waits now outside the window, and everything else inside it", () => {
		for (const count of HOME_COUNTS) {
			const windowed = count
				.filters(OPEN)
				.some((item) => item.operator === "luceneDateRange");
			expect(windowed).toBe(count.section !== "waiting");
		}
	});

	it("counts as not yet sent every status before the supplier's ILS reports it in transit", () => {
		const notYetSent = HOME_COUNTS.find((count) => count.id === "notYetSent")!;
		expect(homeCountQuery(notYetSent, OPEN, SCOPES)).toBe(
			`${SCOPES.supplied} AND ((status:("REQUEST_PLACED_AT_SUPPLYING_AGENCY" OR "CONFIRMED" OR ` +
				`"REQUEST_PLACED_AT_BORROWING_AGENCY" OR "REQUEST_PLACED_AT_PICKUP_AGENCY")))`,
		);
	});

	it("closes the window at both ends when asked to", () => {
		for (const count of WINDOWED_COUNTS) {
			expect(homeCountQuery(count, CLOSED, SCOPES)).toContain(
				`[${CLOSED.from} TO ${CLOSED.to}]`,
			);
		}
	});
});

describe("the window", () => {
	const now = new Date("2026-10-13T08:00:00.000Z");

	it("today starts at the browser's local midnight", () => {
		const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		expect(windowStart({ kind: "today" }, now)).toBe(midnight.toISOString());
	});

	it.each([
		["week", "2026-10-06T08:00:00.000Z"],
		["month", "2026-09-13T08:00:00.000Z"],
	] as const)("the last %s starts that many whole days before now", (kind, start) => {
		expect(windowStart({ kind }, now)).toBe(start);
	});

	it("since a visit starts at that visit", () => {
		expect(windowStart({ kind: "visit", since: SINCE }, now)).toBe(SINCE);
	});

	it("compares with a week earlier only where that week does not overlap the span", () => {
		expect(
			(["today", "week", "month", "visit"] as const).filter(comparesWithLastWeek),
		).toEqual(["today", "week"]);
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

afterEach(() => vi.unstubAllGlobals());

describe("stored visits, read back from the browser", () => {
	const storing = (value: string | null) =>
		vi.stubGlobal("localStorage", { getItem: () => value });

	it.each([
		["not JSON", "{"],
		["no lastSeen", JSON.stringify({ previous: "2026-10-01T00:00:00.000Z" })],
		["a lastSeen that is not a time", JSON.stringify({ lastSeen: "yesterday" })],
		["a lastSeen far too long", JSON.stringify({ lastSeen: "2026-10-01T00:00:00.000Z".repeat(3) })],
	])("are ignored when they hold %s", (_case, value) => {
		storing(value);
		expect(readVisits()).toBeNull();
	});

	it("drop a previous visit that is not a time", () => {
		storing(JSON.stringify({ lastSeen: "2026-10-13T09:00:00.000Z", previous: 42 }));
		expect(readVisits()).toEqual({ lastSeen: "2026-10-13T09:00:00.000Z", previous: null });
	});

	it("are absent when storage cannot be read at all", () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
		});
		expect(readVisits()).toBeNull();
	});
});

describe("a location id in the pickup query", () => {
	it("cannot end its term", () => {
		expect(pickupHereQuery(['a" OR *:*'], SCOPES.borrowed, "READY_FOR_PICKUP")).toContain(
			'pickupLocationCode:("a\\" OR *:*")',
		);
	});
});

describe("a library's history", () => {
	const staleTime = homeHistoryQueryOptions("api", SCOPES).staleTime as (query: {
		state: { data?: { borrowed: number | null; supplied: number | null } };
	}) => number;

	it("is never asked for again once the library has borrowed or supplied", () => {
		expect(staleTime({ state: { data: { borrowed: 0, supplied: 3 } } })).toBe(Infinity);
	});

	it("is asked for again while the library has done neither", () => {
		expect(staleTime({ state: { data: { borrowed: 0, supplied: 0 } } })).toBeLessThan(Infinity);
	});
});

describe("the by-library table", () => {
	it("counts the user's own library under the page's own cache entry", () => {
		vi.stubGlobal("window", {
			__APP_ENV__: { VITE_FEATURE_AGENCY_SCOPED_REQUESTS: "true" },
		});
		const page = {
			borrowed: borrowedByLibraryQuery("e2e-agency", "e2e-lms"),
			supplied: suppliedByLibraryQuery("e2e-agency"),
		};
		const row = {
			borrowed: borrowedByLibraryQuery("e2e-agency", undefined),
			supplied: suppliedByLibraryQuery("e2e-agency"),
		};
		expect(homeCountsQueryOptions("api", row, { kind: "week" }).queryKey).toEqual(
			homeCountsQueryOptions("api", page, { kind: "week" }).queryKey,
		);
	});
});
