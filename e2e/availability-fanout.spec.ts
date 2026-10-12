import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { AGENCY_CODE } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * Every call to /items/availability is one outbound call per member LMS. These
 * count the calls a librarian's ordinary journeys make, because each extra one
 * is tens of requests to systems we do not own.
 */

/** Middlemarch, the first result in the default search fixture. */
const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";

const ITEM = {
	id: "item-1",
	barcode: "30001",
	status: { code: "AVAILABLE" },
	agency: { code: AGENCY_CODE, description: "E2E Test Library" },
	isRequestable: true,
	isSuppressed: false,
	localItemType: "BOOK",
	location: { code: "MAIN", name: "Main" },
};

const choose = async (page: Page, field: RegExp, option: RegExp) => {
	await page.getByRole("combobox", { name: field }).click();
	await page.getByRole("option", { name: option }).click();
};

test("a record journey asks each member library once per filter", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadLocations: {
			locations: {
				totalSize: 1,
				content: [
					{
						id: "loc-1",
						name: "Main desk",
						code: "MAIN",
						agency: { name: "E2E Test Library", code: AGENCY_CODE },
					},
				],
			},
		},
	});
	await app.mockSearch();
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({
			json: { id: RECORD, title: "Middlemarch", contributors: [] },
		}),
	);
	await page.route("**/patron/auth/lookup", (route) =>
		route.fulfill({
			json: {
				status: "VALID",
				localPatronId: ["p1"],
				agencyCode: AGENCY_CODE,
				systemCode: "e2e-lms",
			},
		}),
	);

	const calls = { default: 0, none: 0 };
	await page.route("**/items/availability**", (route) => {
		const url = new URL(route.request().url());
		if (url.searchParams.get("clusteredBibId") === RECORD) {
			calls[url.searchParams.get("filters") === "none" ? "none" : "default"] +=
				1;
		}
		return route.fulfill({ json: { itemList: [ITEM], timings: {} } });
	});

	await page.goto("/requesting?filters=keyword%3Amiddlemarch");
	await expect(
		page.getByRole("button", { name: /place request/i }).first(),
	).toBeEnabled({ timeout: 15_000 });
	await page.getByRole("link", { name: "Middlemarch" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Middlemarch" }),
	).toBeVisible();

	const place = page.getByRole("button", { name: /^place request$/i });
	await expect(place).toBeEnabled({ timeout: 15_000 });

	const dialog = page.getByRole("dialog");
	for (let open = 0; open < 2; open += 1) {
		await place.click();
		await page.getByRole("button", { name: /continue/i }).click();
		const barcode = page.getByRole("textbox", { name: /patron barcode/i });
		await barcode.fill("12345");
		await barcode.press("Enter");
		await page.getByRole("radio", { name: /manual/i }).check();
		await choose(page, /item library/i, /e2e test library/i);

		const picker = page.getByRole("combobox", { name: /item local id/i });
		await picker.click();
		await expect(page.getByRole("option", { name: /30001/ })).toBeVisible();
		await picker.press("Escape");

		await dialog.getByRole("button", { name: /^close$/i }).first().click();
		await expect(dialog).toHaveCount(0);
	}

	// The search card's answer is the record page's and the item picker's. The
	// unfiltered list is a different question - it is what "items not shown"
	// is computed from - so it is asked once in its own right.
	expect(calls).toEqual({ default: 1, none: 1 });
});

test("a page of search results never has more than four availability calls in flight", async ({
	app,
	page,
}) => {
	const instances = Array.from({ length: 20 }, (_, index) => ({
		id: `bbbbbbbb-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
		title: `Record ${index + 1}`,
		publicationDate: "1900",
		sourceTypes: ["Book"],
		contributors: [],
	}));
	// Tall enough that every card is in view at once, so every card asks at once.
	await page.setViewportSize({ width: 1280, height: 10_000 });
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await app.mockSearch({ totalRecords: instances.length, instances });

	let inFlight = 0;
	let peak = 0;
	let served = 0;
	await page.route("**/items/availability**", async (route) => {
		inFlight += 1;
		peak = Math.max(peak, inFlight);
		await new Promise((resolve) => setTimeout(resolve, 300));
		// Before fulfilling: nothing can start in the response's place until the
		// browser has it, so a slot is never counted twice.
		inFlight -= 1;
		served += 1;
		return route.fulfill({ json: { itemList: [], timings: {} } });
	});

	await page.goto("/requesting?filters=keyword%3Arecord&pagesize=20");
	await expect(
		page.getByRole("list", { name: /search results/i }),
	).toBeVisible();

	await expect
		.poll(() => served, { timeout: 30_000 })
		.toBe(instances.length);
	expect(peak).toBeLessThanOrEqual(4);
});
