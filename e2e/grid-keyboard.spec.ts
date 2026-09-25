import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * Every detail page in this application is reached through a grid row. The grid
 * navigated on `onRowClick` alone, which is a pointer event: a keyboard user
 * could focus a cell, press Enter, and reach nothing. WCAG 2.1.1.
 *
 * The leading cell is now the row's link, so this walks the journey a keyboard
 * user actually takes rather than asserting the markup.
 */
test("a patron request opens from the keyboard alone", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
		LoadPatronRequest: { patronRequests: { content: [] } },
	});

	await page.goto("/patronRequests");
	// Named, so the several grids that can share a page are distinguishable.
	await expect(
		page.getByRole("grid", { name: /patron requests/i }),
	).toBeVisible();

	const rowLink = page
		.getByRole("link", { name: /2026-09-01/ })
		.first();
	await expect(rowLink).toBeVisible();

	// Reached by keyboard, not by click: focus it the way Tab would land on it,
	// then activate with the key a keyboard user presses.
	await rowLink.focus();
	await expect(rowLink).toBeFocused();
	await page.keyboard.press("Enter");

	await expect(page).toHaveURL(/\/patronRequests\/11111111-1111-1111-1111-111111111111/);
});
