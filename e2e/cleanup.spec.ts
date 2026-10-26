import { test, expect } from "./fixtures/test";
import type { Page, Route } from "@playwright/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };

/**
 * Clean up on the request grids and the request page: offered to the borrowing library and
 * to a supplying one, by the rule in docs/cleanup.md. Against 9.0.0 and later the server refuses a
 * clean up that would orphan an item still out, and a refusal can be cleaned up anyway after
 * a second confirmation. docs/cleanup.md.
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
			const refused =
				url.pathname.includes("bb000000") && url.searchParams.get("force") !== "true";

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
	await page.getByRole("menuitem", { name: /Clean up selected/ }).click();
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
			page.getByRole("menuitem", { name: "Clean up selected requests (0)" }),
		).toBeDisabled();
		await page.keyboard.press("Escape");

		// Select-all makes the grid's model an EXCLUDE list, whose ids are the rows
		// left out - so its size read 0 while the cleanup acted on the whole page.
		await page.getByRole("checkbox", { name: /select all/i }).check();
		await expect(page.getByRole("button", { name: "Actions (4)" })).toBeVisible();
		await page.getByRole("button", { name: /^Actions/ }).click();
		await expect(
			page.getByRole("menuitem", { name: "Clean up selected requests (4)" }),
		).toBeEnabled();
	});

	test("is offered on the grid of requests this library borrowed", async ({
		app,
		page,
	}) => {
		// Gamma was supplied by another library; this library borrowed it, which on 8.71.0
		// the grid knows by its patron's Host LMS.
		const gamma = supplierRequests.patronRequests.content[2];
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadLibraries: library,
			LoadPatronRequests: {
				patronRequests: {
					totalSize: 1,
					content: [{ ...gamma, patronHostlmsCode: "e2e-lms" }],
				},
			},
		});
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/patronRequests");
		await selectRow(page, GAMMA);
		await runCleanup(page);

		await expect(page.getByRole("dialog").getByText(/Successful/)).toBeVisible();
		expect(calls).toEqual([expect.stringMatching(/cc000000.*\/transition\/cleanup$/)]);
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
		await page.getByRole("menuitem", { name: /Clean up selected/ }).click();

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

		// Told when it finishes, from inside the dialog, where a screen reader is listening
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByRole("status")).toHaveText("Clean-up complete");
		const repeated = await dialog.locator("[id]").evaluateAll((elements) => {
			const ids = elements.map((element) => element.id);
			return ids.filter((id, index) => ids.indexOf(id) !== index);
		});
		expect(repeated).toEqual([]);
	});

	/**
	 * The other half of the update-first rule. ERROR is in untrackedStatuses, so
	 * dcb-service will never poll it again and asking it to would be a call that
	 * cannot change the answer. cleanupPatronRequest.test.ts asserts the helper
	 * skips it; this asserts the grid does, which is where the flag is read.
	 */
	test("more results than fit on a page can be paged through", async ({ app, page }) => {
		test.slow();
		const [alpha] = supplierRequests.patronRequests.content;
		// One more than a page of 25: each is cleaned up through the mocks, five at a time
		const many = Array.from({ length: 26 }, (_, n) => ({
			...alpha,
			id: `aa${String(n).padStart(6, "0")}-1111-5111-9111-111111111111`,
			clusterRecord: { ...alpha.clusterRecord, title: `Title ${n + 1}` },
		}));
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadLibraries: library,
			LoadPatronRequests: { patronRequests: { totalSize: 26, content: many } },
		});
		await recordCleanupCalls(page, []);

		await page.goto("/supplierRequests?pageSize=50");
		await page.getByRole("checkbox", { name: /select all/i }).check();
		await expect(page.getByRole("button", { name: "Actions (26)" })).toBeVisible();
		await runCleanup(page);

		const dialog = page.getByRole("dialog");
		await expect(dialog.getByRole("button", { name: /Successful: 26/ })).toBeVisible({
			timeout: 15_000,
		});
		await dialog.getByRole("button", { name: /Successful: 26/ }).click();
		const results = dialog.getByRole("region", { name: /Successful: 26/ });
		await expect(results.getByText("1–25 of 26")).toBeVisible();
		await results.getByRole("button", { name: "Go to next page" }).click();

		await expect(results.getByText("26–26 of 26")).toBeVisible();
	});

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
	test("reports a refusal, and cleans it up anyway only after a second confirmation", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, BETA);
		await runCleanup(page);

		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText(/Refused while the item is out/)).toBeVisible();
		// "Clean up anyway" asks the reader to confirm where each item is, so each is named
		await expect(
			dialog
				.getByRole("grid", { name: "Requests refused while the item is out" })
				.getByRole("row", { name: new RegExp(BETA) }),
		).toBeVisible();
		// Nothing is forced until somebody asks
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

	test("cleans up a refused request anyway once the item is confirmed", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);

		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto("/supplierRequests");
		await selectRow(page, BETA);
		await runCleanup(page);

		const results = page.getByRole("dialog", { name: /Clean/ }).first();
		await results.getByRole("button", { name: "Clean up anyway (1)" }).click();

		const override = page.getByRole("dialog", { name: "Clean up while the item is out?" });
		const anyway = override.getByRole("button", { name: "Clean up anyway", exact: true });
		await expect(anyway).toBeDisabled();
		await app.expectNoAccessibilityViolations();
		await override.getByRole("checkbox", { name: "I have confirmed where the item is" }).check();
		await anyway.click();

		await expect(page.getByRole("dialog").getByText(/Successful: 1/)).toBeVisible();
		// Forced once, without polling the library systems a second time
		expect(calls.filter((call) => call.includes("force=true"))).toEqual([
			expect.stringMatching(/bb000000.*\/transition\/cleanup\?force=true$/),
		]);
		expect(calls.filter((call) => call.endsWith("/update"))).toHaveLength(1);
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
	const delta = supplierRequests.patronRequests.content[3];

	test("the audit log shows what Check for updates wrote", async ({ app, page }) => {
		let auditFetches = 0;
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			// The supplier's library: unanswered, the page went to Network error mid-test
			LoadLibraryBasics: library,
			LoadPatronRequest: { patronRequests: { totalSize: 1, content: [delta] } },
			LoadHostLms: { hostLms: { content: [] } },
			GetAuditsByPatronRequest: () => {
				auditFetches += 1;
				return { audits: { totalSize: 0, content: [] } };
			},
		});
		await recordCleanupCalls(page, []);

		await page.goto(`/patronRequests/${delta.id}`);
		await page.getByRole("tab", { name: "Audit log" }).click();
		await expect.poll(() => auditFetches).toBe(1);

		await page.getByRole("tab", { name: "General" }).click();
		await page.getByRole("button", { name: "Check for updates" }).click();
		await expect(page.getByText("Check complete")).toBeVisible();
		await page.getByRole("tab", { name: "Audit log" }).click();

		await expect.poll(() => auditFetches).toBe(2);
	});

	test("a request cleaned up from the grid is fetched again when it is opened", async ({
		app,
		page,
	}) => {
		let detailFetches = 0;
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadLibraries: library,
			LoadPatronRequests: supplierRequests,
			LoadPatronRequest: () => {
				detailFetches += 1;
				return { patronRequests: { totalSize: 1, content: [alpha] } };
			},
			LoadHostLms: { hostLms: { content: [] } },
		});
		await recordCleanupCalls(page, []);

		await page.goto(`/patronRequests/${alpha.id}`);
		await expect(page.getByRole("button", { name: "Clean up", exact: true })).toBeVisible();
		await page.getByRole("tab", { name: "Supplier requests" }).click();
		await selectRow(page, ALPHA);
		await runCleanup(page);
		const progress = page.getByRole("dialog");
		await expect(progress.getByText(/Successful/)).toBeVisible();
		await progress.getByRole("button", { name: "Close" }).click();

		await page.getByRole("row", { name: new RegExp(ALPHA) }).getByRole("link").first().click();

		await expect(page.getByRole("button", { name: "Clean up", exact: true })).toBeVisible();
		await expect.poll(() => detailFetches).toBe(2);
	});

	test("asks before cleaning up, and cleans up only once confirmed", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: { patronRequests: { totalSize: 1, content: [alpha] } },
			LoadHostLms: { hostLms: { content: [] } },
		});
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto(`/patronRequests/${alpha.id}`);
		const cleanup = page.getByRole("button", { name: "Clean up", exact: true });
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

	test("says a clean up failed when the service fails, not that the library is not a party", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: { patronRequests: { totalSize: 1, content: [alpha] } },
			LoadHostLms: { hostLms: { content: [] } },
		});
		await page.route("**/patrons/requests/**/transition/cleanup", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/problem+json",
				json: { title: "Internal Server Error", detail: "Cleanup failed; see its audit log" },
			}),
		);

		await page.goto(`/patronRequests/${alpha.id}`);
		await page.getByRole("button", { name: "Clean up", exact: true }).click();
		await page
			.getByRole("dialog", { name: "Clean up this request?" })
			.getByRole("button", { name: "Clean up", exact: true })
			.click();

		await expect(
			page.getByRole("alert").filter({ hasText: "The request could not be cleaned up." }),
		).toBeVisible();
		await expect(page.getByText(/Only the borrowing library or a supplying library/)).toBeHidden();
	});

	test("offers to clean up anyway when the service refuses, with its reason", async ({
		app,
		page,
	}) => {
		const beta = supplierRequests.patronRequests.content[1];
		await app.enableFeatures(["VITE_FEATURE_GUARDED_CLEANUP"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: { patronRequests: { totalSize: 1, content: [beta] } },
			LoadHostLms: { hostLms: { content: [] } },
		});
		const calls: string[] = [];
		await recordCleanupCalls(page, calls);

		await page.goto(`/patronRequests/${beta.id}`);
		await page.getByRole("button", { name: "Clean up", exact: true }).click();
		await page
			.getByRole("dialog", { name: "Clean up this request?" })
			.getByRole("button", { name: "Clean up", exact: true })
			.click();

		const override = page.getByRole("dialog", { name: "Clean up while the item is out?" });
		await expect(override).toContainText("not back at the supplying library (status PICKUP_TRANSIT)");
		await override.getByRole("button", { name: "Cancel" }).click();
		await expect(override).toBeHidden();
		expect(calls.filter((call) => call.includes("force=true"))).toEqual([]);

		await page.getByRole("button", { name: "Clean up", exact: true }).click();
		await page
			.getByRole("dialog", { name: "Clean up this request?" })
			.getByRole("button", { name: "Clean up", exact: true })
			.click();
		await override.getByRole("checkbox", { name: "I have confirmed where the item is" }).check();
		await override.getByRole("button", { name: "Clean up anyway", exact: true }).click();

		await expect(page.getByText("The request has been cleaned up and finalised.")).toBeVisible();
		expect(calls.filter((call) => call.includes("force=true"))).toHaveLength(1);
	});
});
