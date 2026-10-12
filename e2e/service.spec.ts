import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
// A Polaris library with a second Host LMS and credential keys set: the widest
// shape this page renders. The secrets are fixture strings, masked on the page.
import polarisLibrary from "./fixtures-data/library-polaris.json" with { type: "json" };

test.describe("Service", () => {
	test("renders every row it has a value for, and nothing it does not", async ({
		app,
		page,
	}) => {
		await page.setViewportSize({ width: 1600, height: 900 });
		await app.signIn();
		await app.mockGraphQL({ LoadLibraryServiceConfig: polarisLibrary });

		await page.goto("/service");
		await expect(page.getByText("E2E Second Host LMS").first()).toBeVisible();

		// Gated on domain-id, which this library does not set.
		await expect(page.getByText("Polaris staff account: Username")).toBeVisible();
		await expect(page.getByText("undefined", { exact: true })).toHaveCount(0);

		const levels = await page
			.getByRole("main")
			.getByRole("heading")
			.evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))));
		expect(levels[0]).toBe(1);
		expect(Math.max(...levels.slice(1))).toBe(2);

		const duplicateIds = await page.evaluate(() => {
			const ids = Array.from(document.querySelectorAll("[id]"), (node) => node.id);
			return ids.filter((id, index) => ids.indexOf(id) !== index);
		});
		expect(duplicateIds).toEqual([]);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test("says so when the library cannot be loaded", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({});
		await page.route(`${API_BASE}/graphql`, (route) =>
			route.request().postDataJSON()?.operationName === "LoadLibraryServiceConfig"
				? route.fulfill({
						json: { data: null, errors: [{ message: "unavailable" }] },
					})
				: route.fallback(),
		);

		await page.goto("/service");

		await expect(page.getByRole("alert")).toContainText(/could not be loaded/i);
	});
});
