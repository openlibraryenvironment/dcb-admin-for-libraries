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
	await page
		.getByRole("dialog", { name: /^Clean up/ })
		.getByRole("button", { name: "Clean up", exact: true })
		.click();
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

	test("counts a select-all selection, and cleans up nothing when none is selected", async ({
		page,
	}) => {
		await page.goto("/supplierRequests");
		await expect(page.getByRole("row", { name: new RegExp(ALPHA) })).toBeVisible();

		await page.getByRole("button", { name: /^Actions/ }).click();
		await expect(
			page.getByRole("menuitem", { name: "Cleanup selected requests (0)" }),
		).toBeDisabled();
		await page.keyboard.press("Escape");

		// Select-all makes the grid's model an EXCLUDE list, whose ids are the rows
		// left out - so its size read 0 while the cleanup acted on the whole page.
		await page.getByRole("checkbox", { name: /select all/i }).check();
		await expect(page.getByRole("button", { name: "Actions (4)" })).toBeVisible();
		await page.getByRole("button", { name: /^Actions/ }).click();
		await expect(
			page.getByRole("menuitem", { name: "Cleanup selected requests (4)" }),
		).toBeEnabled();
	});

	test("is not offered on the grid of requests this library borrowed", async ({
		page,
	}) => {
		await page.goto("/patronRequests");
		await expect(page.getByRole("row", { name: new RegExp(ALPHA) })).toBeVisible();
		// Rows can be selected here, for the export wizard's selected-rows scope; selecting
		// them still offers no cleanup.
		await page.getByRole("checkbox", { name: /select all/i }).check();
		await expect(page.getByRole("button", { name: /^Actions/ })).toHaveCount(0);
		await expect(page.getByRole("menuitem", { name: /Cleanup/ })).toHaveCount(0);
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

	test("asks before cleaning up, and Cancel cleans up nothing", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, DELTA);
		await page.getByRole("button", { name: /^Actions/ }).click();
		await page.getByRole("menuitem", { name: /Cleanup selected/ }).click();

		const confirm = page.getByRole("dialog", { name: "Clean up this request?" });
		await expect(confirm).toContainText("This cannot be undone.");
		await confirm.getByRole("button", { name: "Cancel" }).click();

		await expect(confirm).toBeHidden();
		await expect(page.getByRole("button", { name: /^Actions/ })).toBeFocused();
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

	/**
	 * The other half of the update-first rule. ERROR is in untrackedStatuses, so
	 * dcb-service will never poll it again and asking it to would be a call that
	 * cannot change the answer. cleanupPatronRequest.test.ts asserts the helper
	 * skips it; this asserts the grid does, which is where the flag is read.
	 */
	test("does not check for updates on a status the service stopped tracking", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, ALPHA);
		await runCleanup(page);

		await expect(page.getByRole("dialog").getByText(/Successful/)).toBeVisible();
		expect(calls).toEqual([expect.stringMatching(/\/transition\/cleanup$/)]);
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
		// Scanned once its fade-in ends: mid-fade, axe measures the Close button
		// blended with the backdrop (3.41:1) whenever the cleanup finishes first.
		await expect
			.poll(() =>
				dialog.evaluate(
					(node) => getComputedStyle(node.parentElement as Element).opacity,
				),
			)
			.toBe("1");
		await app.expectNoAccessibilityViolations();

		// The keyboard half of that scan. MUI marks #root aria-hidden without
		// inert while a Dialog is open, so axe reports aria-hidden-focus as a
		// check it could not DECIDE - it asks whether those elements are tabbable,
		// which only a keyboard can answer. Tab stays inside the dialog, so the
		// grid behind it is unreachable and the aria-hidden is honest.
		for (let press = 0; press < 10; press++) {
			await page.keyboard.press("Tab");
			expect(
				await dialog.evaluate((node) => node.contains(document.activeElement)),
				`focus left the dialog after ${press + 1} tabs`,
			).toBe(true);
		}
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

test.describe("Patron request clean up", () => {
	const [alpha] = supplierRequests.patronRequests.content;

	test("asks before cleaning up, and cleans up only once confirmed", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadPatronRequest: { patronRequests: { totalSize: 1, content: [alpha] } },
			LoadHostLms: { hostLms: { content: [] } },
		});
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto(`/patronRequests/${alpha.id}`);
		const cleanup = page.getByRole("button", { name: "Force clean up" });
		await cleanup.click();

		const confirm = page.getByRole("dialog", { name: "Clean up this request?" });
		await confirm.getByRole("button", { name: "Cancel" }).click();
		await expect(confirm).toBeHidden();
		await expect(cleanup).toBeFocused();
		expect(calls).toEqual([]);

		await cleanup.click();
		await confirm.getByRole("button", { name: "Clean up", exact: true }).click();

		await expect.poll(() => calls).toEqual([expect.stringMatching(/\/transition\/cleanup$/)]);
	});
});
