import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { defaultParseSearch } from "@tanstack/react-router";
import { GridLogicOperator, type GridFilterModel } from "@mui/x-data-grid-premium";

import { MAX_PAGE } from "@constants/dataGrid/pagination";
import {
	auditLogGrid,
	mappingsGrid,
	patronRequestsGrid,
} from "@helpers/dataGrid/gridDefinitions";
import type { GridDefinition } from "@helpers/viewState/defineGrid";
import {
	PRIVATE_FILTER_FIELDS,
	filterFromView,
	filterToView,
	hasDraftItems,
	modelsToView,
	paginationFromView,
	parsePrivateState,
	sortFromView,
	visibilityFromView,
	type GridModels,
	type PrivateGridState,
} from "@helpers/viewState/gridView";
import { validateGridSearch } from "@helpers/viewState/gridSearch";
import { readView } from "@helpers/viewState/readView";
import { stringifySearch } from "@helpers/viewState/searchSerialiser";
import { emptyView, encodeView } from "@helpers/viewState/urlViewCodec";

const BARCODE = "PATRON-BC-90817";
const QUICK = "quick-text-55120";
const NOTE = "please-hold-for-mrs-71";

const grid = patronRequestsGrid;
const { rules } = grid;

const statusItem = { id: 0, field: "status", operator: "is", value: "COMPLETED" };

/** The address a grid's models write, as the router serialises it. */
const hrefOf = (target: GridDefinition, models: GridModels) => {
	const { view, privateState } = modelsToView(target, target.rules, models);
	return { href: stringifySearch(encodeView(view, target.namespace)), privateState };
};

/** What a grid reads from an address, as the router and the route hand it over. */
const read = (target: GridDefinition, href: string, privateState?: unknown): GridModels => {
	const search = validateGridSearch(
		defaultParseSearch(href),
		target.namespace ? [target.namespace] : [],
	);
	const view = readView(target.rules, search, target.namespace);
	return {
		filterModel: filterFromView(target.rules, view, parsePrivateState(target.rules, privateState)),
		sortModel: sortFromView(target, target.rules, view.sort),
		paginationModel: paginationFromView(target, view, MAX_PAGE),
		columnVisibilityModel: visibilityFromView(target, target.rules, view),
	};
};

const defaults = (target: GridDefinition): GridModels => ({
	filterModel: { items: [] },
	sortModel: target.defaultSort,
	paginationModel: { page: 0, pageSize: target.defaultPageSize },
	columnVisibilityModel: target.defaultColumnVisibility,
});

describe("a grid's view in the URL", () => {
	it("reads as what it shows", () => {
		const { href } = hrefOf(grid, {
			...defaults(grid),
			filterModel: {
				items: [
					{ id: 0, field: "status", operator: "isAnyOf", value: ["ERROR", "CONFIRMED"] },
					{ id: 1, field: "errorMessage", operator: "contains", value: "local history" },
				],
			},
			sortModel: [{ field: "dateUpdated", sort: "asc" }],
			paginationModel: { page: 1, pageSize: 50 },
		});

		expect(href).toBe(
			"?filters=status:ERROR,CONFIRMED&filters=errorMessage:contains:local+history" +
				"&sort=dateUpdated:asc&page=2&pageSize=50",
		);
	});

	it("keeps the patron barcode, requester note and quick-search text out, and everything else in", () => {
		const { href, privateState } = hrefOf(grid, {
			...defaults(grid),
			filterModel: {
				items: [
					{ id: 7, field: "patronBarcode", operator: "equals", value: BARCODE },
					{ id: 8, field: "requesterNote", operator: "contains", value: NOTE },
					statusItem,
				],
				quickFilterValues: [QUICK],
			},
		});

		for (const secret of [BARCODE, NOTE, QUICK, "patronBarcode", "requesterNote"]) {
			expect(decodeURIComponent(href)).not.toContain(secret);
		}
		expect(href).toContain("status:COMPLETED");
		expect(JSON.stringify(privateState)).toContain(BARCODE);
		expect(JSON.stringify(privateState)).toContain(NOTE);
		expect(privateState?.quickFilterValues).toEqual([QUICK]);
	});

	it("names every field carrying a patron's barcode or words in one place", () => {
		expect(PRIVATE_FILTER_FIELDS).toContain("patronBarcode");
		expect(PRIVATE_FILTER_FIELDS).toContain("requesterNote");
		expect(PRIVATE_FILTER_FIELDS).not.toContain("itemBarcode");
	});

	it("round-trips a full view, with the private part carried in history state", () => {
		const models: GridModels = {
			filterModel: {
				items: [
					statusItem,
					{ id: 1, field: "patronBarcode", operator: "equals", value: BARCODE },
					{
						id: 2,
						field: "dateCreated",
						operator: "luceneDateRange",
						value: ["2026-09-01T09:15:00.000Z", null],
					},
					{ id: 3, field: "pickupRequestStatus", operator: "isAnyOf", value: ["LOANED", "ERROR"] },
					{ id: 4, field: "outOfSequenceFlag", operator: "is", value: "true" },
					{ id: 5, field: "dateUpdated", operator: "last30Days" },
				],
				logicOperator: GridLogicOperator.Or,
				quickFilterValues: [QUICK],
			},
			sortModel: [{ field: "dateUpdated", sort: "asc" }],
			paginationModel: { page: 3, pageSize: 10 },
			columnVisibilityModel: { ...grid.defaultColumnVisibility, status: false, description: true },
		};

		const { href, privateState } = hrefOf(grid, models);
		const back = read(grid, href, structuredClone(privateState));

		expect(back.paginationModel).toEqual(models.paginationModel);
		expect(back.sortModel).toEqual(models.sortModel);
		expect(back.filterModel.logicOperator).toBe("or");
		expect(back.filterModel.quickFilterValues).toEqual([QUICK]);
		expect(back.filterModel.items).toEqual(models.filterModel.items);
		expect(back.columnVisibilityModel).toMatchObject({ status: false, description: true });
	});

	it("writes nothing for the grid's defaults, so a shared link says only what was chosen", () => {
		const { href, privateState } = hrefOf(grid, defaults(grid));
		expect(href).toBe("");
		expect(privateState).toBeUndefined();
	});

	it("writes a column only where it differs from the grid's default", () => {
		const { href } = hrefOf(grid, {
			...defaults(grid),
			columnVisibilityModel: { ...grid.defaultColumnVisibility, status: false },
		});
		expect(href).toBe("?hide=status");
	});

	it("puts a second grid's view under its namespace", () => {
		const { href } = hrefOf(auditLogGrid, {
			...defaults(auditLogGrid),
			paginationModel: { page: 1, pageSize: auditLogGrid.defaultPageSize },
		});
		expect(href).toBe("?audit.page=2");
		expect(read(auditLogGrid, href).paginationModel.page).toBe(1);
	});
});

describe("a hand-typed or stale address", () => {
	it("opens with its valid part, and nothing else", () => {
		const models = read(
			grid,
			"?page=-3&pageSize=100000&sort=evil:sideways&filters=%7Bgarbage&logic=xor&hide=noSuchColumn",
		);
		expect(models).toEqual(defaults(grid));
	});

	it.each([101, 200, 100000, 0, -1, 2.5])("ignores a page size of %s", (pageSize) => {
		expect(read(grid, `?pageSize=${pageSize}`).paginationModel.pageSize).toBe(grid.defaultPageSize);
	});

	it("accepts a page size the grid offers, up to the bound", () => {
		expect(read(grid, "?pageSize=100").paginationModel.pageSize).toBe(100);
	});

	it("drops each filter the grid cannot take and keeps the rest", () => {
		const models = read(
			grid,
			"?" +
				[
					"status:COMPLETED",
					"noSuchField:x",
					"status:contains:COMPLETED",
					"status:NOT_A_STATUS",
					`patronBarcode:${BARCODE}`,
					"pollCountForCurrentStatus:min:many",
					"dateCreated:from:not a date",
				]
					.map((filter) => `filters=${encodeURIComponent(filter)}`)
					.join("&") +
				"&sort=patronBarcode:asc",
		);
		expect(models.filterModel.items).toEqual([statusItem]);
		expect(models.sortModel).toEqual(grid.defaultSort);
	});

	it("is dropped past any page a person pages to, which is an offset of millions", () => {
		expect(read(grid, `?page=${MAX_PAGE + 1}`).paginationModel.page).toBe(MAX_PAGE);
		expect(read(grid, "?page=200000").paginationModel.page).toBe(0);
	});

	it("never takes a field from history state that the URL could carry", () => {
		const back = read(grid, "", {
			items: [
				{ index: 0, item: { id: 1, field: "status", operator: "is", value: "COMPLETED" } },
				{ index: 1, item: { id: 2, field: "patronBarcode", operator: "equals", value: BARCODE } },
			],
			quickFilterValues: [QUICK, 42],
		} satisfies Record<string, unknown>);
		expect(back.filterModel.items).toEqual([
			{ id: 0, field: "patronBarcode", operator: "equals", value: BARCODE },
		]);
		expect(back.filterModel.quickFilterValues).toEqual([QUICK]);
	});
});

/** Addresses earlier releases wrote, each with what it must still open. The list only grows. */
const OLD_LINKS: { name: string; href: string; target: GridDefinition; expected: Partial<GridModels> }[] = [
	{
		name: "JSON filters with a zero-based page",
		href: `?page=1&sort=status%3Aasc&filters=${encodeURIComponent(
			JSON.stringify([{ id: 63374, field: "status", operator: "is", value: "COMPLETED" }]),
		)}`,
		target: grid,
		expected: {
			filterModel: { items: [statusItem] },
			sortModel: [{ field: "status", sort: "asc" }],
			paginationModel: { page: 1, pageSize: 25 },
		},
	},
	{
		name: "JSON filters joined by OR",
		href: `?logic=or&filters=${encodeURIComponent(
			JSON.stringify([
				statusItem,
				{ id: 9, field: "dateCreated", operator: "luceneDateRange", value: ["2026-09-01T00:00:00.000Z", null] },
			]),
		)}`,
		target: grid,
		expected: {
			filterModel: {
				items: [
					statusItem,
					{ id: 1, field: "dateCreated", operator: "luceneDateRange", value: ["2026-09-01T00:00:00.000Z", null] },
				],
				logicOperator: GridLogicOperator.Or,
			},
		},
	},
	{
		name: "a cleared sort, which meant the grid's own",
		href: "?sort=none",
		target: grid,
		expected: { sortModel: grid.defaultSort },
	},
	{
		name: "the audit log's state as one object",
		href: `?tab=3&audit=${encodeURIComponent(
			JSON.stringify({ page: 1, sort: "auditDate:asc" }),
		)}`,
		target: auditLogGrid,
		expected: {
			sortModel: [{ field: "auditDate", sort: "asc" }],
			paginationModel: { page: 1, pageSize: auditLogGrid.defaultPageSize },
		},
	},
	{
		// The one form that cannot be told from a new link: it opens one page earlier than it did
		name: "a page and nothing else",
		href: "?page=2",
		target: grid,
		expected: { paginationModel: { page: 1, pageSize: 25 } },
	},
];

describe("an address an earlier release wrote", () => {
	it.each(OLD_LINKS)("still opens: $name", ({ href, target, expected }) => {
		expect(read(target, href)).toMatchObject(expected);
	});

	it("is written readably the next time the grid writes", () => {
		const [first] = OLD_LINKS;
		expect(hrefOf(grid, { ...defaults(grid), ...read(grid, first.href) }).href).toBe(
			"?filters=status:COMPLETED&sort=status:asc&page=2",
		);
	});
});

describe("a date the picker chose", () => {
	const at = "2026-10-01T09:30:00.000Z";

	it("reaches the URL as an ISO string, from a single picker and from a range", () => {
		const { filters } = filterToView(rules, {
			items: [
				{ id: 1, field: "dateCreated", operator: "onOrAfter", value: dayjs(at) },
				{ id: 2, field: "dateUpdated", operator: "luceneDateRange", value: [dayjs(at), null] },
			],
		});
		expect(filters).toEqual([
			{ field: "dateCreated", operator: "from", values: [at] },
			{ field: "dateUpdated", operator: "between", values: [at, ""] },
		]);
	});
});

describe("a date operator", () => {
	it("takes only a date, even on a column not typed as one", () => {
		const items = (value: string) =>
			filterFromView(mappingsGrid.rules, {
				filters: [{ field: "lastImported", operator: "from", values: [value] }],
			}).items;

		expect(items("not a date")).toEqual([]);
		expect(items("2026-10-01T00:00:00.000Z")).toHaveLength(1);
	});
});

describe("an unfinished filter row", () => {
	it.each([
		["no value", { id: 1, field: "status", operator: "is" }],
		["an empty list", { id: 1, field: "status", operator: "isAnyOf", value: [] }],
		["a cleared range", { id: 1, field: "dateCreated", operator: "luceneDateRange", value: [null, null] }],
	])("with %s stays out of the URL", (_case, item) => {
		expect(filterToView(rules, { items: [item] }).filters).toEqual([]);
	});

	it("is a draft until it is finished", () => {
		expect(hasDraftItems(rules, { items: [{ id: 1, field: "status", operator: "is" }] })).toBe(true);
		expect(hasDraftItems(rules, { items: [statusItem] })).toBe(false);
	});
});

describe("the logic between filters", () => {
	it("is written only while it joins two or more", () => {
		const or = (count: number) =>
			filterToView(rules, {
				items: Array.from({ length: count }, (_, id) => ({ ...statusItem, id })),
				logicOperator: GridLogicOperator.Or,
			} satisfies GridFilterModel).logic;

		expect(or(2)).toBe("or");
		// "Remove all" keeps MUI's OR on an empty model
		expect(or(1)).toBeUndefined();
		expect(or(0)).toBeUndefined();
	});
});

describe("history state", () => {
	it("holds nothing when nothing is private", () => {
		const { privateState } = modelsToView(grid, rules, {
			...defaults(grid),
			filterModel: { items: [statusItem] },
		});
		expect(privateState satisfies PrivateGridState | undefined).toBeUndefined();
		expect(encodeView(emptyView())).toEqual({});
	});
});

describe("the route's own list of a grid's parameters", () => {
	it("is the codec's, so a route never drops one the grid writes", async () => {
		const { GRID_PARAMS } = await import("@helpers/viewState/gridSearch");
		const { VIEW_PARAMS } = await import("@helpers/viewState/urlViewCodec");
		expect(GRID_PARAMS).toEqual(VIEW_PARAMS);
	});
});
