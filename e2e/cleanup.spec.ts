import { test, expect } from "./fixtures/test";
import type { Page, Route } from "@playwright/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };

/**
 * Clean up on the supplier requests grid.
 *
 * Clean up deletes the borrowing library's temporary records, so it belongs to the library
 * that SUPPLIED the request - a request this library only borrowed is never offered, and
 * neither is one supplied by somebody else. Against dcb-service 9.0.0 the server refuses a
 * clean up that would orphan an item still out; this application reports that refusal and
 * offers no override, because only a consortium administrator can overrule it.
 */

const ALPHA = "Alpha and the art of failure";
const BETA = "Beta in transit";
const GAMMA = "Gamma supplied elsewhere";
// Tracked, so dcb-service is worth polling before cleaning up - unlike ERROR, which it
// never polls again.
const DELTA = "Delta on the hold shelf";

/** Every cleanup and update call, in order, with its query string. */
const recordCleanupCalls = async (page: Page, calls: string[]) => {
	await page.route("**/patrons/requests/**", async (route: Route) => {
		if (route.request().method() !== "POST") return route.fallback();

		const url = new URL(route.request().url());
		calls.push(`${url.pathname}${url.search}`);

		if (url.pathname.endsWith("/transition/cleanup")) {
			const refused = url.pathname.includes("bb000000");

			return refused
				? route.fulfill({
						status: 409,
						contentType: "application/problem+json",
						json: {
							title: "Cannot clean up a request while the item is out",
							detail:
								"The item for this request is not back at the supplying library (status PICKUP_TRANSIT).",
							patronRequestStatus: "PICKUP_TRANSIT",
							lastKnownItemOutStatus: "PICKUP_TRANSIT",
						},
					})
				: route.fulfill({ status: 200, json: "ok" });
		}

		return route.fulfill({ status: 200, json: "ok" });
	});
};

const selectRow = async (page: Page, title: string) => {
	const row = page.getByRole("row", { name: new RegExp(title) });
	await expect(row).toBeVisible();
	await row.getByRole("checkbox").check();

	// The Actions button's label carries the selection count, so the toolbar re-renders
	// when the count arrives - and a menu opened before that has its items swapped out
	// underneath the click. Wait for the count, not for the button.
	await expect(page.getByRole("button", { name: /^Actions \(\d/ })).toBeVisible();
};

const runCleanup = async (page: Page) => {
	await page.getByRole("button", { name: /^Actions/ }).click();
	await page.getByRole("menuitem", { name: /Cleanup selected/ }).click();
};

test.describe("Supplier requests clean up", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			// The grid's library filter options. Unmocked, the route errors and renders
			// "Network error detected" instead of the grid.
			LoadLibraries: library,
			LoadPatronRequests: supplierRequests,
		});
	});

	test("never offers a request another library supplied", async ({ page }) => {
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, GAMMA);
		await runCleanup(page);

		await expect(page.getByRole("dialog").getByText(/Not eligible/)).toBeVisible();
		expect(calls).toEqual([]);
	});

	test("checks for updates first, then cleans up", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, DELTA);
		await runCleanup(page);

		await expect(page.getByRole("dialog").getByText(/Successful/)).toBeVisible();
		expect(calls).toEqual([
			expect.stringContaining("/update"),
			expect.stringMatching(/\/transition\/cleanup$/),
		]);
	});

	test("reports a refusal, and offers no override", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, BETA);
		await runCleanup(page);

		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText(/Refused while the item is out/)).toBeVisible();
		await expect(
			dialog.getByRole("button", { name: /Clean up anyway/ }),
		).toHaveCount(0);

		// Nothing was forced: the item is out and only the consortium can overrule that.
		expect(calls.filter((call) => call.includes("force=true"))).toEqual([]);

		// The result dialog is a surface a user reads and acts on, so it meets the floor.
		await app.expectNoAccessibilityViolations();
	});

	test("hides an item-out request against a service that cannot refuse it", async ({
		page,
	}) => {
		// Flags off: dcb-service 8.71.0, which cleans up whatever it is asked to.
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, BETA);
		await runCleanup(page);

		await expect(page.getByRole("dialog").getByText(/Not eligible/)).toBeVisible();
		expect(calls).toEqual([]);
	});
});
