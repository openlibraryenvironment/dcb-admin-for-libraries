import type { Page } from "@playwright/test";
import { test, expect, type AppFixture } from "./fixtures/test";
import { AGENCY_CODE } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";

const CLUSTER = {
	id: RECORD,
	title: "Middlemarch",
	description: "A study of provincial life",
	contributors: [{ name: "Eliot, George" }],
	sourceTypes: ["Book"],
};

/** Thirty items, so the default page of 25 leaves five for page two. */
const ITEMS = Array.from({ length: 30 }, (_, index) => {
	const n = String(index + 1).padStart(2, "0");
	return {
		id: `item-${n}`,
		barcode: `300${n}`,
		status: { code: "AVAILABLE" },
		agency: { code: AGENCY_CODE, description: "E2E Test Library" },
		isRequestable: true,
		isSuppressed: false,
		availabilityDate: `2026-01-${n}T00:00:00Z`,
		location: { code: "MAIN", name: "Main" },
	};
});

const openRecord = async (
	app: AppFixture,
	page: Page,
	path: string,
	availability: { status?: number } = {},
) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({ json: CLUSTER }),
	);
	await page.route("**/items/availability**", (route) =>
		availability.status
			? route.fulfill({ status: availability.status, json: {} })
			: route.fulfill({ json: { itemList: ITEMS, timings: {} } }),
	);
	await page.goto(path);
};

test("the items grid pages past the first 25", async ({ app, page }) => {
	await openRecord(app, page, `/requesting/${RECORD}/items`);

	const grid = page.getByRole("grid", { name: /^items$/i });
	await expect(grid.getByText("item-30")).toBeVisible({ timeout: 15_000 });
	await expect(grid.getByText("item-01")).toHaveCount(0);

	await page.getByRole("button", { name: /next page/i }).first().click();

	// Sorted newest availability first, so page two is the five oldest.
	await expect(grid.getByText("item-01")).toBeVisible();
	await expect(grid.getByText("item-30")).toHaveCount(0);
});

test("a failed availability call is reported, not shown as no items", async ({
	app,
	page,
}) => {
	// A 4xx, because a 5xx is retried with a backoff measured in seconds.
	await openRecord(app, page, `/requesting/${RECORD}/items`, { status: 404 });

	await expect(
		page.getByText(/could not load the associated items/i),
	).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(/no items found/i)).toHaveCount(0);
});

test("a record id that is not a UUID is not found, and nothing is fetched", async ({
	app,
	page,
}) => {
	const fetched: string[] = [];
	page.on("request", (request) => {
		if (/availability|opac-inventory/.test(request.url())) {
			fetched.push(request.url());
		}
	});
	await openRecord(app, page, "/requesting/not-a-record");

	await expect(page.getByText("/requesting/not-a-record")).toBeVisible();
	expect(fetched).toEqual([]);
});

for (const [path, title] of [
	["", /^Record information · /],
	["/items", /^Items · /],
	["/history", /^Requesting history · /],
] as const) {
	test(`the record's ${path || "information"} page titles itself`, async ({
		app,
		page,
	}) => {
		await openRecord(app, page, `/requesting/${RECORD}${path}`);
		await expect(page).toHaveTitle(title);
	});
}

test("the record page has a heading and named tabs before the record arrives", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({ status: 404, json: {} }),
	);
	await page.route("**/items/availability**", (route) =>
		route.fulfill({ json: { itemList: [], timings: {} } }),
	);
	await page.goto(`/requesting/${RECORD}`);

	await expect(
		page.getByRole("heading", { level: 1, name: "Cluster record", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("tablist", { name: /record sections/i }),
	).toBeVisible();
});

test("says why a record cannot be requested, beside the button", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({ json: CLUSTER }),
	);
	await page.route("**/items/availability**", (route) =>
		route.fulfill({ json: { itemList: [], timings: {} } }),
	);
	await page.goto(`/requesting/${RECORD}`);

	const place = page.getByRole("button", { name: /^place request$/i });
	await expect(place).toBeDisabled();
	await expect(place).toHaveAccessibleDescription(/no items available/i);
	await expect(page.getByText(/no items available to request/i)).toBeVisible();
});

test("the record information shows no raw JSON", async ({ app, page }) => {
	await openRecord(app, page, `/requesting/${RECORD}`);
	await page.getByRole("button", { name: /cluster details/i }).click();
	await expect(page.locator("pre")).toHaveCount(0);
});
