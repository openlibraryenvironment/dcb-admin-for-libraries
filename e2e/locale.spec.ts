import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import type { Page } from "@playwright/test";

/**
 * VITE_LOCALE decides the English and the date order for a deployment, and a
 * user can override it. Asserted where each is visible: the Insights range
 * picker, whose sections run in the locale's order; the Preferences page, whose
 * wording differs; and the page's `lang`, which screen readers pronounce by.
 */

test.beforeEach(async ({ app }) => {
	await app.signIn();
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await app.mockStats();
});

/** The first date's three sections, in the order the reader meets them. */
async function expectDateOrder(page: Page, order: string[]) {
	await page.goto("/insights");
	const sections = page.getByRole("spinbutton");
	for (const [index, name] of order.entries()) {
		await expect(sections.nth(index)).toHaveAccessibleName(name);
	}
}

test("a deployment that sets nothing reads British English, day first", async ({
	page,
}) => {
	await expectDateOrder(page, ["Day", "Month", "Year"]);
	await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");

	await page.goto("/preferences");
	await expect(
		page.getByRole("radiogroup", { name: "Colour scheme" }),
	).toBeVisible();
});

test("an en-US deployment reads American English, month first", async ({
	app,
	page,
}) => {
	await app.configure({ VITE_LOCALE: "en-US" });

	await expectDateOrder(page, ["Month", "Day", "Year"]);
	await expect(page.locator("html")).toHaveAttribute("lang", "en-US");

	await page.goto("/preferences");
	await expect(
		page.getByRole("radiogroup", { name: "Color scheme" }),
	).toBeVisible();

	// Column headers are translated when their module loads, which must be
	// after the bundle has: otherwise they render as keys.
	await page.goto("/patronRequests");
	await expect(
		page.getByRole("columnheader", { name: "Request created" }),
	).toBeVisible();
});

test("a user can choose the other English, and keeps it across a reload", async ({
	app,
	page,
}) => {
	await app.configure({ VITE_LOCALE: "en-GB" });
	await page.goto("/preferences");

	const language = page.getByRole("radiogroup", { name: "Language" });
	await expect(
		language.getByRole("radio", {
			name: "Consortium default: English (United Kingdom)",
		}),
	).toBeChecked();
	await language
		.getByRole("radio", { name: "English (United States)" })
		.check();

	await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
	await expect(
		page.getByRole("radiogroup", { name: "Color scheme" }),
	).toBeVisible();

	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
	await expectDateOrder(page, ["Month", "Day", "Year"]);
});

test("an unknown VITE_LOCALE falls back to British English", async ({
	app,
	page,
}) => {
	await app.configure({ VITE_LOCALE: "fr-FR" });
	await expectDateOrder(page, ["Day", "Month", "Year"]);
	await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
});
