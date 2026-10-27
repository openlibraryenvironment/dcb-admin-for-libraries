import type { Page } from "@playwright/test";
import { test, expect, type AppFixture } from "./fixtures/test";
import { covers } from "./fixtures/coverage";
import { DEFAULT_SEARCH } from "./fixtures/search";
import library from "./fixtures-data/library.json" with { type: "json" };

/** Every search request the page makes, as URLs. */
const openSearch = async (
	app: AppFixture,
	page: Page,
	path: string,
	roles?: string[],
) => {
	await app.signIn(roles ? { roles } : undefined);
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	const searches: URL[] = [];
	await page.route("**/search/instances**", (route) => {
		searches.push(new URL(route.request().url()));
		return route.fulfill({ json: DEFAULT_SEARCH });
	});
	await page.route("**/items/availability**", (route) =>
		route.fulfill({ json: { itemList: [], timings: {} } }),
	);
	await page.goto(path);
	await expect(
		page.getByRole("heading", { level: 1, name: /requesting/i }),
	).toBeVisible();
	return searches;
};

test("a hand-typed URL renders, and never asks for more than 100 rows", async ({
	app,
	page,
}) => {
	const searches = await openSearch(
		app,
		page,
		"/requesting?filters=12345&pagesize=100000&pageno=abc",
	);

	await expect.poll(() => searches.length).toBeGreaterThan(0);
	for (const search of searches) {
		expect(Number(search.searchParams.get("limit"))).toBeLessThanOrEqual(100);
		expect(search.searchParams.get("offset")).toBe("0");
	}
});

test("a new search starts at its first page", async ({ app, page }) => {
	const searches = await openSearch(
		app,
		page,
		"/requesting?filters=keyword%3Amiddlemarch&pageno=3&pagesize=10",
	);
	await expect.poll(() => searches.length).toBe(1);
	expect(searches[0].searchParams.get("offset")).toBe("30");

	await page.getByRole("textbox", { name: /search term/i }).fill("bleak house");
	await page.getByRole("button", { name: /^search$/i }).click();

	await expect.poll(() => searches.length).toBe(2);
	expect(searches[1].searchParams.get("offset")).toBe("0");
});

test("the address names its page one-based, and a link from before 2.0.0 still opens", async ({
	app,
	page,
}) => {
	const searches = await openSearch(
		app,
		page,
		"/requesting?filters=keyword%3Amiddlemarch&page=4&pageSize=10",
	);
	await expect.poll(() => searches.length).toBe(1);
	expect(searches[0].searchParams.get("offset")).toBe("30");
	expect(searches[0].searchParams.get("limit")).toBe("10");

	// pageno was zero-based: 3 is the fourth page, as it always was
	await page.goto("/requesting?filters=keyword%3Amiddlemarch&pageno=3&pagesize=10");
	await expect.poll(() => searches.at(-1)?.searchParams.get("offset")).toBe("30");
});

test("a cluster record ID that is not one is refused before it is sent", async ({
	app,
	page,
}) => {
	const searches = await openSearch(app, page, "/requesting");

	await page.getByRole("combobox", { name: /field/i }).click();
	await page.getByRole("option", { name: /cluster record id/i }).click();
	await page.getByRole("textbox", { name: /search term/i }).fill("title=x) OR (");

	await expect(page.getByText(/a cluster record id looks like/i)).toBeVisible();
	await expect(page.getByRole("button", { name: /^search$/i })).toBeDisabled();
	expect(searches).toHaveLength(0);
});

test("every icon button on the page has a name", async ({ app, page }) => {
	await openSearch(app, page, "/requesting?filters=keyword%3Amiddlemarch", [
		"CONSORTIUM_ADMIN",
		"LIBRARY_ADMIN",
	]);

	await page.getByRole("button", { name: /show advanced search/i }).click();
	await page.getByRole("button", { name: /add filter/i }).click();
	await expect(
		page.getByRole("button", { name: /remove filter/i }).first(),
	).toBeVisible();

	await page.getByRole("button", { name: /^actions$/i }).click();
	await page.getByRole("menuitem", { name: /quick walk-up request/i }).click();
	const dialog = page.getByRole("dialog", { name: /quick walk-up request/i });
	await dialog.getByRole("button", { name: /^close$/i }).click();
	await expect(dialog).toHaveCount(0);
});

for (const mode of ["simple", "advanced"] as const) {
	test(`the ${mode} search reflows at 320px`, covers(`The ${mode} search works on a phone-width screen without scrolling sideways.`, ["1.4.10"]), async ({ app, page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		await openSearch(app, page, "/requesting?filters=keyword%3Amiddlemarch");
		if (mode === "advanced") {
			await page.getByRole("button", { name: /show advanced search/i }).click();
			await page.getByRole("button", { name: /add filter/i }).click();
		}
		await expect(
			page.getByRole("list", { name: /search results/i }),
		).toBeVisible();

		const overflow = await page.evaluate(
			() =>
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth,
		);
		expect(overflow).toBe(0);
	});
}

// 320 CSS px is also a 1280px screen at 400% zoom - WCAG 1.4.10
test("at 320px wide, the page buttons are on screen", covers("On a phone-width screen, the previous and next page buttons are on screen.", ["1.4.10"]), async ({ app, page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await openSearch(app, page, "/requesting?filters=12345");

	for (const name of ["Go to previous page", "Go to next page"]) {
		const button = page.getByRole("button", { name });
		await expect(button).toBeVisible();
		const box = await button.boundingBox();
		expect(box!.x, name).toBeGreaterThanOrEqual(0);
		expect(box!.x + box!.width, name).toBeLessThanOrEqual(320);
	}
});

test("a result says why it can or cannot be requested, from the keyboard", async ({
	app,
	page,
}) => {
	await openSearch(app, page, "/requesting?filters=12345");

	await expect(page.getByText("Not available for walk-up requesting", { exact: true }).first()).toBeVisible();
	const about = page.getByRole("button", { name: "About walk-up requesting for this record" }).first();
	await about.focus();
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");

	const why = /^Not available for walk-up requesting: there is currently no available item/;
	await expect(page.getByRole("tooltip")).toHaveText(why);
	await expect(about).toHaveAccessibleDescription(why);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("tooltip")).toHaveCount(0);

	await page.getByRole("button", { name: "About staff requesting for this record" }).first().click();
	await expect(page.getByRole("tooltip")).toHaveText(
		/^Not available for staff requesting: there is currently no available item/,
	);
});

test("a new page of results is announced, and says which page", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await page.route("**/search/instances**", (route) =>
		route.fulfill({ json: { ...DEFAULT_SEARCH, totalRecords: 60 } }),
	);
	await page.route("**/items/availability**", (route) =>
		route.fulfill({ json: { itemList: [], timings: {} } }),
	);
	await page.goto("/requesting?filters=12345");
	const announcer = page.getByRole("status").filter({ hasText: /\S/ });
	await expect(announcer).toHaveText(/60 titles found/);

	await page.getByRole("button", { name: "Go to next page" }).click();

	await expect(announcer).toHaveText(/Page 2 of 3, 60 titles found\./);
});

test("a failed search is reported in the page, under its one heading", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraries: library });
	await page.route("**/search/instances**", (route) => route.fulfill({ status: 500, json: {} }));

	await page.goto("/requesting?filters=12345");

	await expect(page.getByRole("alert")).toContainText("error connecting to the search service", {
		timeout: 15_000,
	});
	await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});
