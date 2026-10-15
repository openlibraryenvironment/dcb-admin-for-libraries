import type { Page } from "@playwright/test";
import { test, expect, type AppFixture } from "./fixtures/test";
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
	test(`the ${mode} search reflows at 320px`, async ({ app, page }) => {
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
test("at 320px wide, the page buttons are on screen", async ({ app, page }) => {
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
