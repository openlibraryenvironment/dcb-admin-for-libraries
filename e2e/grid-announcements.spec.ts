import { test, expect } from "./fixtures/test";
import { covers } from "./fixtures/coverage";
import library from "./fixtures-data/library.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };

/**
 * A server-paged grid redraws silently: the row count changes on screen and
 * nothing tells a screen-reader user. WCAG 4.1.3 Status Messages.
 */
test("says how many rows a sort settled on, and the order it put them in", covers("Sorting a table tells screen-reader users how many rows it shows, and in what order.", ["4.1.3"]), async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: supplierRequests,
	});

	await page.goto("/supplierRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	await expect(page.getByRole("status").filter({ hasText: /results/ })).toHaveCount(0);

	await page.getByRole("columnheader", { name: /Request created/ }).click();

	await expect(
		page
			.getByRole("status")
			.filter({ hasText: "4 results, sorted by Request created, ascending" }),
	).toHaveCount(1);
});
