import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

// A search changed the grid and the count on screen and said nothing: the count
// renders into a span and the grid redraws silently. WCAG 4.1.3.

const SEARCH_RESULTS = {
	totalRecords: 3,
	instances: [
		{ id: "aaaaaaaa-0000-0000-0000-000000000001", title: "Middlemarch" },
		{ id: "aaaaaaaa-0000-0000-0000-000000000002", title: "Bleak House" },
		{ id: "aaaaaaaa-0000-0000-0000-000000000003", title: "Villette" },
	],
};

test("a search announces how many titles it found", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });
	await page.route("**/search/instances**", (route) =>
		route.fulfill({ json: SEARCH_RESULTS }),
	);

	await page.goto("/requesting");

	const region = page.getByRole("status");
	await expect(region).toBeAttached();

	await page
		.getByRole("textbox")
		.first()
		.fill("middlemarch");
	await page.getByRole("button", { name: /^search$/i }).click();

	// The region carries the count, so a screen reader hears the result rather
	// than only seeing it.
	await expect(region).toHaveText(/3 titles found/);

	// ...and the results are a list, not a one-column grid announced as a table.
	const results = page.getByRole("list", { name: /search results/i });
	await expect(results).toBeVisible();
	await expect(results.getByRole("listitem")).toHaveCount(3);
	await expect(page.getByRole("grid")).toHaveCount(0);
});

test("a navigation announces the page it arrived at", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });

	await page.goto("/contacts");
	const region = page.getByRole("status");

	await page.getByRole("tab", { name: /^settings$/i }).click();

	// A full page load announces itself and resets focus. A client-side
	// navigation does neither, so both have to be arranged.
	await expect(region).toHaveText(/Settings/);
	await expect(page.getByRole("main")).toBeFocused();
});
