import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
	defaultParseSearch,
	defaultStringifySearch,
} from "@tanstack/react-router";
import { GridLogicOperator, type GridFilterModel } from "@mui/x-data-grid-premium";

import {
	PRIVATE_FILTER_FIELDS,
	filterToSearch,
	hasDraftItems,
	readFilter,
	readGrid,
	readSort,
	serialiseGrid,
} from "@helpers/dataGrid/gridSearch";
import { mappingsGrid, patronRequestsGrid } from "@helpers/dataGrid/gridDefinitions";

const BARCODE = "PATRON-BC-90817";
const QUICK = "quick-text-55120";
const NOTE = "please-hold-for-mrs-71";

/** What the router does with the search a navigate is handed, and back. */
const throughUrl = (search: object) => {
	const href = defaultStringifySearch(search as Record<string, unknown>);
	const parsed = patronRequestsGrid.searchSchema.parse(
		defaultParseSearch(href),
	);
	return { href, parsed };
};

const statusItem = {
	id: 1,
	field: "status",
	operator: "is",
	value: "COMPLETED",
};

describe("grid state in the URL", () => {
	it("keeps the patron barcode, requester note and quick-search text out of the URL, and everything else in", () => {
		const filterModel: GridFilterModel = {
			items: [
				{ id: 7, field: "patronBarcode", operator: "equals", value: BARCODE },
				{ id: 8, field: "requesterNote", operator: "contains", value: NOTE },
				statusItem,
			],
			quickFilterValues: [QUICK],
		};

		const { search, state } = serialiseGrid(patronRequestsGrid, {
			filterModel,
			sortModel: [{ field: "dateUpdated", sort: "asc" }],
			paginationModel: { page: 2, pageSize: 50 },
		});
		const { href } = throughUrl(search);

		for (const secret of [BARCODE, NOTE, QUICK]) {
			expect(href).not.toContain(secret);
			expect(decodeURIComponent(href)).not.toContain(secret);
		}
		expect(decodeURIComponent(href)).not.toContain("patronBarcode");
		expect(decodeURIComponent(href)).toContain("COMPLETED");
		expect(decodeURIComponent(href)).toContain("dateUpdated:asc");
		expect(search.page).toBe(2);
		expect(search.pageSize).toBe(50);

		expect(JSON.stringify(state)).toContain(BARCODE);
		expect(JSON.stringify(state)).toContain(NOTE);
		expect(state?.quickFilterValues).toEqual([QUICK]);
	});

	it("names every field carrying a patron's barcode or words in one place", () => {
		expect(PRIVATE_FILTER_FIELDS).toContain("patronBarcode");
		expect(PRIVATE_FILTER_FIELDS).toContain("requesterNote");
		expect(PRIVATE_FILTER_FIELDS).not.toContain("itemBarcode");
	});

	it("drops a hand-typed junk URL entirely", () => {
		const parsed = patronRequestsGrid.searchSchema.parse(
			defaultParseSearch(
				"?page=-3&pageSize=100000&sort=evil:sideways&filters=%7Bgarbage&logic=xor",
			),
		);
		expect(parsed).toEqual({});

		const models = readGrid(patronRequestsGrid, parsed, undefined);
		expect(models.paginationModel).toEqual({ page: 0, pageSize: 25 });
		expect(models.sortModel).toEqual(patronRequestsGrid.defaultSort);
		expect(models.filterModel.items).toEqual([]);
	});

	it.each([101, 200, 100000, 0, -1, 2.5, "25"])(
		"rejects a page size of %s",
		(pageSize) => {
			expect(
				patronRequestsGrid.searchSchema.parse({ pageSize }).pageSize,
			).toBeUndefined();
		},
	);

	it("accepts a page size the grid offers, up to the bound", () => {
		expect(patronRequestsGrid.searchSchema.parse({ pageSize: 100 })).toEqual({
			pageSize: 100,
		});
	});

	it("drops each invalid filter item and keeps the valid ones", () => {
		const parsed = patronRequestsGrid.searchSchema.parse({
			filters: [
				statusItem,
				{ id: 2, field: "noSuchField", operator: "equals", value: "x" },
				{ id: 3, field: "status", operator: "contains", value: "COMPLETED" },
				{ id: 4, field: "status", operator: "is", value: "NOT_A_STATUS" },
				{ id: 5, field: "clusterRecordTitle", operator: "contains", value: "moby" },
				{ id: 6, field: "patronBarcode", operator: "equals", value: BARCODE },
				{ id: 8, field: "pollCountForCurrentStatus", operator: "equals", value: { $gt: 1 } },
				{ id: 9, field: "dateCreated", operator: "onOrAfter", value: "not a date" },
				"not an item",
				null,
			],
			sort: "patronBarcode:asc",
		});

		expect(parsed.filters).toEqual([statusItem]);
		expect(parsed.sort).toBeUndefined();
	});

	it("round-trips a valid model, with the private part carried in history state", () => {
		const filterModel: GridFilterModel = {
			items: [
				statusItem,
				{ id: 2, field: "patronBarcode", operator: "equals", value: BARCODE },
				{
					id: 3,
					field: "dateCreated",
					operator: "luceneDateRange",
					value: ["2026-09-01T09:15:00.000Z", null],
				},
				{ id: 4, field: "pickupRequestStatus", operator: "isAnyOf", value: ["LOANED", "ERROR"] },
				{ id: 5, field: "outOfSequenceFlag", operator: "is", value: "true" },
				{ id: 6, field: "dateUpdated", operator: "last30Days" },
			],
			logicOperator: "or" as GridFilterModel["logicOperator"],
			quickFilterValues: [QUICK],
		};
		const models = {
			filterModel,
			sortModel: [{ field: "dateUpdated", sort: "asc" as const }],
			paginationModel: { page: 3, pageSize: 10 },
		};

		const { search, state } = serialiseGrid(patronRequestsGrid, models);
		const { parsed } = throughUrl(search);
		const back = readGrid(
			patronRequestsGrid,
			parsed,
			structuredClone(state),
		);

		expect(back.paginationModel).toEqual(models.paginationModel);
		expect(back.sortModel).toEqual(models.sortModel);
		expect(back.filterModel.logicOperator).toBe("or");
		expect(back.filterModel.quickFilterValues).toEqual([QUICK]);
		expect(back.filterModel.items).toEqual(filterModel.items);
	});

	it("writes nothing for the grid's defaults, so a shared link says only what was chosen", () => {
		const { search, state } = serialiseGrid(patronRequestsGrid, {
			filterModel: { items: [] },
			sortModel: patronRequestsGrid.defaultSort,
			paginationModel: { page: 0, pageSize: 25 },
		});
		expect(defaultStringifySearch(search as Record<string, unknown>)).toBe("");
		expect(state).toBeUndefined();
	});

	it("reads a cleared sort as the grid's default, which is what the server sorts by", () => {
		const { search } = serialiseGrid(patronRequestsGrid, {
			filterModel: { items: [] },
			sortModel: [],
			paginationModel: { page: 0, pageSize: 25 },
		});
		expect(search.sort).toBeUndefined();
		// An older link or saved filter still says "none"
		expect(readSort(patronRequestsGrid, "none")).toEqual(patronRequestsGrid.defaultSort);
	});

	it("never takes a private field from history state that the grid cannot filter on", () => {
		const back = readGrid(patronRequestsGrid, {}, {
			items: [
				{ index: 0, item: { id: 1, field: "status", operator: "is", value: "COMPLETED" } },
				{ index: 1, item: { id: 2, field: "patronBarcode", operator: "equals", value: BARCODE } },
			],
			quickFilterValues: [QUICK, 42],
		} as never);
		expect(back.filterModel.items).toEqual([
			{ id: 2, field: "patronBarcode", operator: "equals", value: BARCODE },
		]);
		expect(back.filterModel.quickFilterValues).toEqual([QUICK]);
	});
});

describe("a date the picker chose", () => {
	const at = "2026-10-01T09:30:00.000Z";

	it("reaches the URL as an ISO string, from a single picker and from a range", () => {
		const { search } = filterToSearch(patronRequestsGrid, {
			items: [
				{ id: 1, field: "dateCreated", operator: "onOrAfter", value: dayjs(at) },
				{ id: 2, field: "dateUpdated", operator: "luceneDateRange", value: [dayjs(at), null] },
			],
		});

		expect(search.filters).toEqual([
			{ id: 1, field: "dateCreated", operator: "onOrAfter", value: at },
			{ id: 2, field: "dateUpdated", operator: "luceneDateRange", value: [at, null] },
		]);
	});
});

describe("a date operator", () => {
	it("takes only a date, even on a column not typed as one", () => {
		const read = (value: string) =>
			readFilter(
				mappingsGrid,
				{ filters: [{ id: 1, field: "lastImported", operator: "onOrAfter", value }] },
				undefined,
			).items;

		expect(read("not a date")).toEqual([]);
		expect(read("2026-10-01T00:00:00.000Z")).toHaveLength(1);
	});
});

describe("an unfinished filter row", () => {
	it.each([
		["no value", { id: 1, field: "status", operator: "is" }],
		["an empty list", { id: 1, field: "status", operator: "isAnyOf", value: [] }],
		["a cleared range", { id: 1, field: "dateCreated", operator: "luceneDateRange", value: [null, null] }],
	])("with %s stays out of the URL", (_case, item) => {
		expect(filterToSearch(patronRequestsGrid, { items: [item] }).search.filters).toBeUndefined();
	});

	it("is a draft until it is finished", () => {
		expect(hasDraftItems(patronRequestsGrid, { items: [{ id: 1, field: "status", operator: "is" }] })).toBe(true);
		expect(hasDraftItems(patronRequestsGrid, { items: [statusItem] })).toBe(false);
	});
});

describe("the logic between filters", () => {
	it("is written only while it joins two or more", () => {
		const or = (count: number) =>
			filterToSearch(patronRequestsGrid, {
				items: Array.from({ length: count }, (_, id) => ({ ...statusItem, id })),
				logicOperator: GridLogicOperator.Or,
			}).search.logic;

		expect(or(2)).toBe("or");
		// "Remove all" keeps MUI's OR on an empty model
		expect(or(1)).toBeUndefined();
		expect(or(0)).toBeUndefined();
	});
});

describe("a URL that passed the route's shape check", () => {
	it("is narrowed to the grid's own fields and operators before it becomes a query", () => {
		const model = readFilter(
			patronRequestsGrid,
			{
				filters: [
					{ id: 1, field: "notAColumn", operator: "equals", value: "x" },
					{ id: 2, field: "status", operator: "notAnOperator", value: "x" },
					{ id: 3, field: "status", operator: "is", value: "COMPLETED" },
				],
			},
			undefined,
		);
		expect(model.items.map((item) => item.id)).toEqual([3]);
	});

	it("drops a sort on a field the grid cannot sort", () => {
		expect(readSort(patronRequestsGrid, "notAColumn:asc")).toEqual(
			patronRequestsGrid.defaultSort,
		);
	});
});

