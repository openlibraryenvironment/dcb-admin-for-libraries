import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { patronRequestsGrid } from "@helpers/dataGrid/gridDefinitions";
import { savedSearchOf } from "@helpers/viewState/savedSearch";
import { storageKey } from "@helpers/appBase";
import {
	MAX_SAVED_FILTERS,
	SavedFilterLimitError,
	type SavedFilterSearch,
	clearSessionSavedFilters,
	sessionSavedFilterStore as store,
} from "@helpers/savedFilters";

/** A Storage whose keys are its own enumerable properties, as the browser's are. */
const memoryStorage = () => {
	const storage = {} as Record<string, string>;
	Object.defineProperties(storage, {
		getItem: { value: (key: string) => (key in storage ? storage[key] : null) },
		setItem: { value: (key: string, value: string) => (storage[key] = String(value)) },
		removeItem: { value: (key: string) => delete storage[key] },
	});
	return storage as unknown as Storage & Record<string, string>;
};

const GRID = "patronRequests";
const STATUS: SavedFilterSearch = {
	filters: [{ field: "status", operator: "is", values: ["ERROR"] }],
};
/** What an earlier release stored: the grid's own filter items. */
const LEGACY_STATUS = { filters: [{ id: 1, field: "status", operator: "is", value: "ERROR" }] };
let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
	storage = memoryStorage();
	vi.stubGlobal("sessionStorage", storage);
});
afterEach(() => vi.unstubAllGlobals());

describe("the session store", () => {
	it("keeps each grid's filters apart", async () => {
		await store.save(GRID, "Errors", STATUS);
		await store.save("supplierRequests", "Errors", STATUS);

		expect((await store.list(GRID)).map((filter) => filter.name)).toEqual(["Errors"]);
		expect(await store.list("bibs")).toEqual([]);
	});

	it("replaces a filter saved under the same name, whatever its case", async () => {
		await store.save(GRID, "Errors", STATUS);
		const replacement = await store.save(GRID, "errors", {
			filters: [],
			sort: [{ field: "dateCreated", direction: "asc" }],
		});

		expect(await store.list(GRID)).toEqual([replacement]);
	});

	it(`holds at most ${MAX_SAVED_FILTERS} per grid, and still lets one be replaced`, async () => {
		for (let index = 0; index < MAX_SAVED_FILTERS; index++) {
			await store.save(GRID, `Filter ${index}`, STATUS);
		}

		await expect(store.save(GRID, "One more", STATUS)).rejects.toBeInstanceOf(
			SavedFilterLimitError,
		);
		await expect(store.save(GRID, "Filter 0", STATUS)).resolves.toMatchObject({
			name: "Filter 0",
		});
	});

	it("deletes one by id", async () => {
		const kept = await store.save(GRID, "Kept", STATUS);
		const gone = await store.save(GRID, "Gone", STATUS);

		await store.remove(GRID, gone.id);

		expect(await store.list(GRID)).toEqual([kept]);
	});

	it.each([
		["not JSON", "{"],
		["not a list", JSON.stringify({ name: "x" })],
	])("reads nothing from storage holding %s", async (_case, raw) => {
		storage.setItem(storageKey(`savedFilters:${GRID}`), raw);
		expect(await store.list(GRID)).toEqual([]);
	});

	it("drops entries that are not saved filters", async () => {
		const good = await store.save(GRID, "Good", STATUS);
		const key = storageKey(`savedFilters:${GRID}`);
		const stored = JSON.parse(storage.getItem(key)!);
		storage.setItem(
			key,
			JSON.stringify([
				...stored,
				{ id: "x", name: "", savedAt: "", search: {} },
				{ id: "y", name: "n".repeat(61), savedAt: "", search: {} },
				{ id: "z", name: "No search", savedAt: "" },
			]),
		);

		expect(await store.list(GRID)).toEqual([good]);
	});
});

describe("signing out", () => {
	it("clears this app's saved filters and nothing else", async () => {
		await store.save(GRID, "Errors", STATUS);
		storage.setItem("another-app:savedFilters:patronRequests", "[]");
		storage.setItem(storageKey("afterLoginRedirectPath"), "/bibs");

		clearSessionSavedFilters();

		expect(await store.list(GRID)).toEqual([]);
		expect(Object.keys(storage).sort()).toEqual(
			["another-app:savedFilters:patronRequests", storageKey("afterLoginRedirectPath")].sort(),
		);
	});
});

describe("a saved search, applied to its grid", () => {
	const { rules } = patronRequestsGrid;

	it("keeps only what the grid's URL may carry", () => {
		expect(
			savedSearchOf(rules, {
				filters: [
					...STATUS.filters,
					{ field: "patronBarcode", operator: "is", values: ["PB8675309"] },
					{ field: "noSuchColumn", operator: "is", values: ["x"] },
				],
				sort: [{ field: "dateCreated", direction: "asc" }],
				page: 4,
			}),
		).toEqual({ ...STATUS, sort: [{ field: "dateCreated", direction: "asc" }] });
	});

	it("reads what an earlier release stored, through the same allow-list", () => {
		expect(
			savedSearchOf(rules, {
				filters: [
					...LEGACY_STATUS.filters,
					{ id: 2, field: "patronBarcode", operator: "equals", value: "PB8675309" },
				],
				sort: "dateCreated:asc",
				logic: "or",
			}),
		).toEqual({ ...STATUS, sort: [{ field: "dateCreated", direction: "asc" }] });
	});

	it("is empty when what was stored is not a search", () => {
		expect(savedSearchOf(rules, "status:ERROR")).toEqual({ filters: [] });
	});
});
