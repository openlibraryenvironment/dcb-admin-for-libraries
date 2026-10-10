import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };

/**
 * The export menu offered "Export all as CSV" on every grid, and on a grid with
 * no export handler of its own every item did nothing at all.
 */
test("a grid with no export of its own exports through the grid", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadMappings: mappings });

	await page.goto("/mappings");
	await expect(page.getByRole("grid")).toBeVisible();
	await page.getByRole("button", { name: "Export" }).click();

	await expect(
		page.getByRole("menuitem", { name: "Print current page" }),
	).toBeVisible();
	const download = page.waitForEvent("download");
	await page
		.getByRole("menuitem", { name: "Export current page as CSV" })
		.click();
	expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});
