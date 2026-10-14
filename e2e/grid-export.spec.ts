import { test, expect } from "./fixtures/test";
import { AGENCY_CODE } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

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

// main offered "Export all as TSV"; a toolbar rewrite in 2.0 QA dropped it. It is now a
// format in the export wizard, beside the current page and print, which stay.
test("the request grids still export everything as TSV", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
		// The user's library, on the rows' Host LMS, so the library guard keeps them: an export
		// it empties downloads nothing
		LoadAgencyLocationsForExport: {
			agencies: {
				totalSize: 1,
				content: [{ code: AGENCY_CODE, hostLms: { code: "E2E-HOST" }, locations: [] }],
			},
		},
		LoadPatronRequestsForExport: patronRequests,
	});

	await page.goto("/patronRequests");
	await expect(page.getByRole("grid", { name: /patron requests/i })).toBeVisible();
	await page.getByRole("button", { name: "Export" }).click();
	await expect(
		page.getByRole("menuitem", { name: "Export current page as CSV" }),
	).toBeVisible();
	await expect(page.getByRole("menuitem", { name: "Print current page" })).toBeVisible();
	await page.getByRole("menuitem", { name: "Export…" }).click();

	const dialog = page.getByRole("dialog", { name: "Export requests" });
	await dialog.getByRole("radio", { name: "All rows, ignoring the filters" }).check();
	await dialog.getByRole("radio", { name: "TSV" }).check();
	const download = page.waitForEvent("download");
	await dialog.getByRole("button", { name: "Export", exact: true }).click();
	expect((await download).suggestedFilename()).toBe("patronRequests_export.tsv");
});
