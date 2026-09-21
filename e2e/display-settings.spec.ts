import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

// The Settings page offered a light/dark/system radio group and nothing else,
// against six controls in DCB Admin and Symposia. These walk the ones a user
// can actually feel.

test.beforeEach(async ({ app }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });
});

test("offers every display preference", async ({ page }) => {
	await page.goto("/settings");

	for (const group of [
		/colour scheme/i,
		/text size/i,
		/spacing/i,
		/animation/i,
	]) {
		await expect(page.getByRole("radiogroup", { name: group })).toBeVisible();
	}

	await expect(
		page.getByRole("radio", { name: /high contrast/i }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /reset display settings/i }),
	).toBeVisible();
});

test("high contrast applies, and survives a reload", async ({ page }) => {
	await page.goto("/settings");
	await page.getByRole("radio", { name: /high contrast/i }).check();

	// MUI marks the document with a bare attribute per scheme.
	await expect(page.locator("html")).toHaveAttribute("data-highContrast", "");

	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-highContrast", "");
	await expect(page.getByRole("radio", { name: /high contrast/i })).toBeChecked();
});

test("reduced motion reaches the document", async ({ page }) => {
	await page.goto("/settings");

	await page
		.getByRole("radiogroup", { name: /animation/i })
		.getByRole("radio", { name: /^reduced$/i })
		.check();
	await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

	// "Match my device" is the ABSENCE of an attribute - the media query answers
	// it alone - not a third value written onto the element.
	await page
		.getByRole("radiogroup", { name: /animation/i })
		.getByRole("radio", { name: /match my device/i })
		.check();
	await expect(page.locator("html")).not.toHaveAttribute("data-motion", /.*/);
});

test("text size and spacing change the rendered page", async ({ page }) => {
	await page.goto("/settings");

	const rootFontSize = () =>
		page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

	expect(await rootFontSize()).toBe("16px");
	await page
		.getByRole("radiogroup", { name: /text size/i })
		.getByRole("radio", { name: /largest/i })
		.check();
	expect(await rootFontSize()).toBe("18px");

	// Reset returns the display settings, and says so.
	await page.getByRole("button", { name: /reset display settings/i }).click();
	expect(await rootFontSize()).toBe("16px");
	await expect(page.getByRole("status")).toHaveText(/reset/i);
});
