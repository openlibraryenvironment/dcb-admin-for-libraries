import { test, expect } from "./fixtures/test";
import { covers } from "./fixtures/coverage";
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
test("a patron request opens from the keyboard alone", covers("A request can be opened from a table with the keyboard alone.", ["2.1.1"]), async ({ app, page }) => {
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

test("a cell reached by arrow key shows a focus outline", covers("A table cell reached with the arrow keys shows where the focus is.", ["2.4.7"]), async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});

	await page.goto("/patronRequests");
	const rowLink = page.getByRole("link", { name: /2026-09-01/ }).first();
	await expect(rowLink).toBeVisible();
	await rowLink.focus();
	await page.keyboard.press("ArrowRight");

	// WCAG 2.4.7: the cell after the link has nothing focusable inside it, so
	// the cell's own outline is the only sign of where the keyboard is.
	const focused = page.locator('[role="gridcell"]:focus');
	await expect(focused).toHaveCount(1);
	const outline = await focused.evaluate((cell) => {
		const style = getComputedStyle(cell);
		return { style: style.outlineStyle, width: style.outlineWidth };
	});
	expect(outline.style).not.toBe("none");
	expect(parseFloat(outline.width)).toBeGreaterThan(0);
});

test("a grid wider than the screen scrolls by wheel and touch", async ({
	app,
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});

	await page.goto("/patronRequests");
	await expect(page.getByRole("link", { name: /2026-09-01/ }).first()).toBeVisible();

	// The scroller is the grid's own scroll container; overflow: hidden on it
	// left the custom scrollbar as the only way across, which no wheel, trackpad
	// or finger reaches.
	const scroller = page.locator(".MuiDataGrid-virtualScroller").first();
	await scroller.hover();
	await page.mouse.wheel(400, 0);
	await expect
		.poll(() => scroller.evaluate((element) => element.scrollLeft))
		.toBeGreaterThan(0);
});
