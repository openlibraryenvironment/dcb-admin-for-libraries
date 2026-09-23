import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

// The Settings page offered a light/dark/system radio group and nothing else,
// against six controls in DCB Admin and Symposia. These walk the ones a user
// can actually feel.

test.beforeEach(async ({ app }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });
});

/**
 * Computed styles read straight after goto are the BROWSER defaults - React has
 * not mounted and emotion has injected nothing. 16px and "Times New Roman" both
 * look like plausible answers, so this waits for the page to exist first.
 */
const open = async (page: import("@playwright/test").Page) => {
	await page.goto("/settings");
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

test("offers every display preference", async ({ page }) => {
	await open(page);

	for (const group of [
		/colour scheme/i,
		/text size/i,
		/typeface/i,
		/spacing/i,
		/animation/i,
		/times and dates shown in/i,
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
	await open(page);
	await page.getByRole("radio", { name: /high contrast/i }).check();

	// MUI marks the document with a bare attribute per scheme.
	await expect(page.locator("html")).toHaveAttribute("data-highContrast", "");

	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-highContrast", "");
	await expect(page.getByRole("radio", { name: /high contrast/i })).toBeChecked();
});

test("reduced motion reaches the document", async ({ page }) => {
	await open(page);

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
	await open(page);

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

test("the typeface reaches the rendered page", async ({ page }) => {
	await open(page);

	const bodyFont = () =>
		page.evaluate(() => getComputedStyle(document.body).fontFamily);

	expect(await bodyFont()).toContain("Roboto");

	// Chosen by what it is FOR, not by its name - which is why the picker shows
	// the description beside each one.
	await page
		.getByRole("radio", { name: /atkinson hyperlegible/i })
		.check();
	expect(await bodyFont()).toContain("Atkinson Hyperlegible");
});

test("links to the accessibility statement, which says where it falls short", async ({
	page,
}) => {
	await open(page);
	await page.getByRole("link", { name: /^accessibility$/i }).click();

	await expect(
		page.getByRole("heading", { level: 1, name: /accessibility/i }),
	).toBeVisible();

	// The honest half is the reason this is a page rather than a marketing line.
	await expect(
		page.getByRole("heading", { level: 2, name: /fall short/i }),
	).toBeVisible();

	// Somewhere to send a problem, not just a claim.
	await expect(
		page.getByRole("link", { name: /dcb@k-int\.com/i }),
	).toBeVisible();
});

/**
 * Every timestamp used to be rendered on the reader’s clock and labelled with
 * nothing, so two colleagues in different zones read different numbers for one
 * event and neither could tell.
 */
test("timestamps name their clock, and the reader can change it", async ({
	app,
	page,
}) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await open(page);

	const clocks = page.getByRole("radiogroup", {
		name: /times and dates shown in/i,
	});
	await clocks.getByRole("radio", { name: /UTC/i }).check();

	await page.goto("/patronRequests");
	const grid = page.getByRole("grid", { name: /patron requests/i });
	await expect(grid).toBeVisible();

	// The fixture records 2026-09-01T09:15:00Z.
	await expect(page.getByText("2026-09-01 09:15 UTC").first()).toBeVisible();
});
