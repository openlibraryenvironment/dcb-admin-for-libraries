import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };

/** What dcb-service says about itself on /info; a failed request where version is null. */
const serviceReports = async (page: Page, version: string | null) => {
	await page.route(`${API_BASE}/info`, (route) =>
		version === null
			? route.fulfill({ status: 503 })
			: route.fulfill({ json: { git: { build: { version } } } }),
	);
};

const statusOf = (page: Page, feature: string) =>
	page
		.getByRole("row")
		.filter({ has: page.getByRole("rowheader", { name: feature, exact: true }) })
		.getByRole("cell")
		.last();

test.describe("Feature availability", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
	});

	test("on 8.71.0, says Insights needs a newer DCB service", async ({ app, page }) => {
		await serviceReports(page, "8.71.0");
		await page.goto("/preferences");

		const table = page.getByRole("table", { name: "Feature availability" });
		await expect(table).toBeVisible();
		await expect(page.getByText("reports version 8.71.0")).toBeVisible();
		await expect(statusOf(page, "Insights")).toHaveText("Needs a newer DCB service");
		await expect(statusOf(page, "Confirm item is back")).toHaveText("Needs a newer DCB service");
		// Nothing a patron sees through a discovery front end, where none is deployed
		await expect(table.getByRole("rowheader", { name: "Announcements" })).toHaveCount(0);

		await app.expectNoAccessibilityViolations();
	});

	test("on 9.2.0, tells a switched-on feature from one not switched on yet", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await serviceReports(page, "9.2.0");
		await page.goto("/preferences");

		await expect(statusOf(page, "Insights")).toHaveText("Available");
		await expect(statusOf(page, "Confirm item is back")).toHaveText(
			"Supported, but not switched on for your consortium yet",
		);
	});

	test("says it cannot tell when the version cannot be read", async ({ page }) => {
		await serviceReports(page, null);
		await page.goto("/preferences");

		await expect(statusOf(page, "Insights")).toHaveText(
			"Cannot tell: the DCB service version could not be read",
			{ timeout: 15_000 },
		);
	});
});
