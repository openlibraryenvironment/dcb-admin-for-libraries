import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

// The layout rendered a header, a ten-tab strip and a Container - none of them a
// landmark, and no way past them. A keyboard user passed the logo, the library
// selector, sign-out and every tab before reaching the page, on every
// navigation. WCAG 2.4.1 and 1.3.1.

test.beforeEach(async ({ app }) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
		LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
	});
});

test("the page has a main and a named navigation landmark", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("main")).toHaveCount(1);
	await expect(
		page.getByRole("navigation", { name: /main navigation/i }),
	).toHaveCount(1);
});

test("the first Tab reaches a skip link that moves focus to main", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByText("E2E Test Library").first()).toBeVisible();

	await page.keyboard.press("Tab");

	const skip = page.getByRole("link", { name: /skip to main content/i });
	await expect(skip).toBeFocused();
	// Hidden until focused, so it must be on screen now rather than off at -9999.
	await expect(skip).toBeInViewport();

	await page.keyboard.press("Enter");
	await expect(page.getByRole("main")).toBeFocused();
});
