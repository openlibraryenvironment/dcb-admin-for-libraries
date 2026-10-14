import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Download, Page, Route } from "@playwright/test";
import { test, expect, type AppFixture } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import { AGENCY_CODE } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * The export wizard, and the library guard every file it writes goes through: a request
 * leaves in a file only if one of the user's libraries borrowed it, supplied it, or owns
 * its pickup location. docs/export.md.
 */

const PICKUP = "aaaaaaaa-0000-4000-8000-000000000001";
const IN_SCOPE = "11111111-1111-4111-8111-111111111111";
const OUT_OF_SCOPE = "99999999-9999-4999-8999-999999999999";

const request = (id: string, overrides: Record<string, unknown>) => ({
	id,
	dateCreated: "2026-09-01T09:15:00Z",
	dateUpdated: "2026-09-01T10:15:00Z",
	patronHostlmsCode: "e2e-lms",
	pickupLocationCode: null,
	description: `Request ${id}`,
	status: "REQUEST_PLACED_AT_SUPPLYING_AGENCY",
	requesterNote: null,
	requestingIdentity: { localBarcode: null, canonicalPtype: null },
	suppliers: [],
	clusterRecord: { title: `Title ${id}` },
	...overrides,
});

const EXPORT_ROWS = {
	patronRequests: {
		totalSize: 2,
		pageable: { number: 0, offset: 0 },
		content: [
			request(IN_SCOPE, { suppliers: [{ localAgency: AGENCY_CODE }] }),
			// Same Host LMS as the user's library, so a Host LMS scope would let it through.
			request(OUT_OF_SCOPE, {
				pickupLocationCode: "bbbbbbbb-0000-4000-8000-000000000002",
				suppliers: [{ localAgency: "someone-else" }],
			}),
		],
	},
};

// 8.71.0, the e2e default: the patron's library is its Host LMS, as the borrowed grid has it.
const GUARD = `(patronHostlmsCode:"e2e-lms" OR supplyingAgencyCode:"${AGENCY_CODE}" OR pickupLocationCode:"${PICKUP}")`;

const mockExport = async (
	app: AppFixture,
	exportRows: Record<string, unknown> = EXPORT_ROWS,
) =>
	app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
		LoadAgencyLocationsForExport: {
			agencies: {
				totalSize: 1,
				content: [
					{ code: AGENCY_CODE, hostLms: { code: "e2e-lms" }, locations: [{ id: PICKUP }] },
				],
			},
		},
		LoadLocation: { locations: { totalSize: 0, content: [] } },
		LoadPatronRequestsForExport: exportRows,
	});

/** Every export request's variables, in order. */
const recordExportQueries = async (page: Page) => {
	const sent: Record<string, unknown>[] = [];
	page.on("request", (sentRequest) => {
		if (sentRequest.url() !== `${API_BASE}/graphql`) return;
		const body = sentRequest.postDataJSON();
		if (body?.operationName === "LoadPatronRequestsForExport") sent.push(body.variables);
	});
	return sent;
};

const openWizard = async (page: Page) => {
	await expect(page.getByRole("grid", { name: /patron requests/i })).toBeVisible();
	await page.getByRole("button", { name: "Export" }).click();
	await page.getByRole("menuitem", { name: "Export…" }).click();
	const dialog = page.getByRole("dialog", { name: "Export requests" });
	await expect(dialog).toBeVisible();
	return dialog;
};

const submit = async (page: Page, format: string) => {
	const dialog = page.getByRole("dialog", { name: "Export requests" });
	await dialog.getByRole("button", { name: "Select all" }).click();
	await dialog
		.getByRole("radiogroup", { name: "Format" })
		.getByRole("radio", { name: format })
		.check();
	await dialog.getByRole("button", { name: "Export", exact: true }).click();
};

const exportFrom = async (page: Page, format: string): Promise<Download> => {
	const download = page.waitForEvent("download");
	await submit(page, format);
	return download;
};

const contentOf = async (download: Download) =>
	readFileSync(await download.path(), "utf8");

test.beforeEach(async ({ app }) => {
	await app.signIn();
});

test("the downloaded file holds only requests one of the user's libraries is party to", async ({
	app,
	page,
}) => {
	await app.enableFeatures(["VITE_FEATURE_AGENCY_SCOPED_REQUESTS"]);
	await mockExport(app);
	await page.goto("/patronRequests");
	await openWizard(page);

	const download = await exportFrom(page, "CSV");
	expect(download.suggestedFilename()).toBe("patronRequests_export.csv");
	// A UTF-8 byte-order mark, so Excel does not read accented and Welsh titles as mojibake
	expect([...readFileSync(await download.path()).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
	const csv = await contentOf(download);
	expect(csv).toContain(IN_SCOPE);
	expect(csv).not.toContain(OUT_OF_SCOPE);
	await expect(page.getByRole("alert")).toContainText("Exported 1 request.");
});

test("on 8.71.0 the export holds what the borrowed grid shows: its libraries' Host LMS", async ({
	app,
	page,
}) => {
	await mockExport(app);
	await page.goto("/patronRequests");
	await openWizard(page);

	const csv = await contentOf(await exportFrom(page, "CSV"));
	expect(csv).toContain(IN_SCOPE);
	expect(csv).toContain(OUT_OF_SCOPE);
	await expect(page.getByRole("alert")).toContainText("Exported 2 requests.");
});

test("every export request carries the library guard ahead of the grid's query", async ({
	app,
	page,
}) => {
	await mockExport(app);
	const sent = await recordExportQueries(page);
	await page.goto("/patronRequests");
	await openWizard(page);
	await exportFrom(page, "TSV");

	expect(sent.length).toBeGreaterThan(0);
	for (const variables of sent) {
		expect(String(variables.query)).toBe(`${GUARD} AND (patronHostlmsCode:e2e-lms)`);
		expect(variables.pagesize).toBeLessThanOrEqual(100);
	}
});

test("on a dcb-service that can ask for it, the guard names the patron's library too", async ({
	app,
	page,
}) => {
	await app.enableFeatures(["VITE_FEATURE_AGENCY_SCOPED_REQUESTS"]);
	await mockExport(app);
	const sent = await recordExportQueries(page);
	await page.goto("/patronRequests");
	await openWizard(page);
	await exportFrom(page, "CSV");

	expect(String(sent[0]?.query)).toBe(
		`(patronAgencyCode:"${AGENCY_CODE}" OR supplyingAgencyCode:"${AGENCY_CODE}" OR pickupLocationCode:"${PICKUP}") AND (patronAgencyCode:e2e-agency)`,
	);
});

test("a selected-rows export asks the server for those ids, through the guard", async ({
	app,
	page,
}) => {
	await mockExport(app);
	const sent = await recordExportQueries(page);
	await page.goto("/patronRequests");

	await page.getByRole("checkbox", { name: "Select row" }).first().check();
	const dialog = await openWizard(page);
	await dialog.getByRole("radio", { name: "The selected row (1)" }).check();
	await exportFrom(page, "CSV");

	expect(String(sent[0]?.query)).toBe(
		`${GUARD} AND (id:"${patronRequests.patronRequests.content[0].id}")`,
	);
});

test("the selected-rows scope says why it is unavailable with nothing selected", async ({
	app,
	page,
}) => {
	await mockExport(app);
	await page.goto("/patronRequests");
	const dialog = await openWizard(page);

	const selected = dialog.getByRole("radio", { name: "The selected rows (0)" });
	await expect(selected).toBeDisabled();
	await expect(selected).toHaveAccessibleDescription(
		"Select rows in the grid to export only those.",
	);
});

test("an export over the row cap is refused before it is fetched", async ({ app, page }) => {
	await mockExport(app, {
		patronRequests: { ...EXPORT_ROWS.patronRequests, totalSize: 10_001 },
	});
	const sent = await recordExportQueries(page);
	await page.goto("/patronRequests");
	await openWizard(page);
	await submit(page, "CSV");

	await expect(
		page.getByText(/would include 10001 requests, more than the 10000/),
	).toBeVisible();
	expect(sent).toHaveLength(1);
});

test("Cancel stops an export and aborts the request in flight", async ({ app, page }) => {
	await mockExport(app);
	await page.route(`${API_BASE}/graphql`, async (route: Route) => {
		if (route.request().postDataJSON()?.operationName !== "LoadPatronRequestsForExport") {
			return route.fallback();
		}
		// Never answered: only the abort ends it.
		await new Promise(() => undefined);
	});
	const failed = page.waitForEvent(
		"requestfailed",
		(failedRequest) =>
			failedRequest.postDataJSON()?.operationName === "LoadPatronRequestsForExport",
	);

	await page.goto("/patronRequests");
	const dialog = await openWizard(page);
	await dialog.getByRole("button", { name: "Export", exact: true }).click();

	const progress = page.getByRole("dialog", { name: "Exporting data" });
	await expect(progress).toBeVisible();
	await progress.getByRole("button", { name: "Cancel export" }).click();

	await failed;
	await expect(progress).toBeHidden();
	await expect(page.getByText("The export was cancelled.")).toBeVisible();
});

test("the wizard is keyboard-complete and gives focus back to the Export button", async ({
	app,
	page,
}) => {
	await mockExport(app);
	await page.goto("/patronRequests");
	const dialog = await openWizard(page);

	await expect(dialog.getByRole("group", { name: "Columns" })).toBeVisible();
	await expect(dialog.getByRole("radiogroup", { name: "Rows" })).toBeVisible();
	await expect(dialog.getByRole("radiogroup", { name: "Format" })).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))
		.toBe(true);

	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("button", { name: "Export" })).toBeFocused();
});

test("an export with no columns is refused, and the reason is tied to the columns", async ({
	app,
	page,
}) => {
	await mockExport(app);
	await page.goto("/patronRequests");
	const dialog = await openWizard(page);

	await dialog.getByRole("button", { name: "Clear all" }).click();
	const reason = "Choose at least one column to export.";
	await expect(dialog.getByRole("group", { name: "Columns" })).toHaveAccessibleDescription(reason);
	await expect(
		dialog.getByRole("button", { name: "Export", exact: true }),
	).toHaveAccessibleDescription(reason);
});

test("a file name with a path separator is refused", async ({ app, page }) => {
	await mockExport(app);
	await page.goto("/patronRequests");
	const dialog = await openWizard(page);

	const name = dialog.getByRole("textbox", { name: "File name" });
	await name.fill("../requests");
	await expect(name).toHaveAttribute("aria-invalid", "true");
	await expect(name).toHaveAccessibleDescription(/cannot start with a dot or contain \//);
});

// No 'unsafe-eval'. The Excel library carries one direct eval, in a vm polyfill that
// writing a workbook should never reach. This proves it is never reached.
test("Excel exports under a strict Content-Security-Policy", async ({ app, page }) => {
	await mockExport(app);
	await page.addInitScript(() => {
		const violations: string[] = [];
		(window as unknown as { __csp: string[] }).__csp = violations;
		document.addEventListener("securitypolicyviolation", (event) =>
			violations.push(
				`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`,
			),
		);
	});
	await page.route(
		(url) => url.pathname === "/patronRequests",
		async (route) => {
			if (route.request().resourceType() !== "document") return route.fallback();
			const response = await route.fetch();
			const html = await response.text();
			const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
				([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
			);
			await route.fulfill({
				response,
				// An unhashed inline script, to prove the policy is enforced at all.
				body: html.replace("</body>", "<script>window.__unhashed = true</script></body>"),
				headers: {
					...response.headers(),
					"content-security-policy": `script-src 'self' ${hashes.join(" ")}`,
				},
			});
		},
	);

	const violations = () =>
		page.evaluate(() => [...(window as unknown as { __csp: string[] }).__csp]);

	await page.goto("/patronRequests");
	await openWizard(page);
	// Only the test's own unhashed inline script is refused at start-up; zod runs jitless.
	const startup = await violations();
	expect(startup.filter((violation) => !violation.includes(" inline "))).toEqual([]);
	const before = startup.length;
	const download = await exportFrom(page, "Excel (.xlsx)");

	expect(download.suggestedFilename()).toBe("patronRequests_export.xlsx");
	expect(readFileSync(await download.path()).subarray(0, 2).toString()).toBe("PK");
	expect(
		await page.evaluate(() => (window as unknown as { __unhashed?: boolean }).__unhashed),
	).toBeUndefined();
	expect((await violations()).slice(before)).toEqual([]);
});

/** Holds the export's request until the test lets it go; never, if it does not. */
const holdExport = async (page: Page) => {
	let release: () => void = () => undefined;
	const released = new Promise<void>((resolve) => (release = resolve));
	await page.route(`${API_BASE}/graphql`, async (route: Route) => {
		if (route.request().postDataJSON()?.operationName !== "LoadPatronRequestsForExport") {
			return route.fallback();
		}
		await released;
		await route.fallback();
	});
	return release;
};

test("after an export finishes, focus is back on the Export button", async ({ app, page }) => {
	await mockExport(app);
	const release = await holdExport(page);
	await page.goto("/patronRequests");
	await openWizard(page);
	const download = page.waitForEvent("download");
	await submit(page, "CSV");

	// Long enough for the wizard to have closed and unmounted behind the progress dialog
	const progress = page.getByRole("dialog", { name: "Exporting data" });
	await expect(progress).toBeVisible();
	await expect(page.getByRole("dialog", { name: "Export requests" })).toHaveCount(0);
	release();

	await download;
	await expect(progress).toBeHidden();
	await expect(page.getByRole("button", { name: "Export", exact: true })).toBeFocused();
});

test("a click outside the progress dialog does not cancel; Escape does", async ({ app, page }) => {
	await mockExport(app);
	await holdExport(page);
	await page.goto("/patronRequests");
	await openWizard(page);
	await submit(page, "CSV");

	const progress = page.getByRole("dialog", { name: "Exporting data" });
	await expect(progress).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(progress).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(progress).toBeHidden();
	await expect(page.getByText("The export was cancelled.")).toBeVisible();
});

test("leaving the grid during an export stops it, and nothing downloads", async ({
	app,
	page,
}) => {
	await mockExport(app);
	await holdExport(page);
	const downloads: Download[] = [];
	page.on("download", (download) => downloads.push(download));
	const aborted = page.waitForEvent(
		"requestfailed",
		(failedRequest) =>
			failedRequest.postDataJSON()?.operationName === "LoadPatronRequestsForExport",
	);
	// Back to a page inside the app, so the grid unmounts rather than the app unloading
	await page.goto("/");
	await page.getByRole("tab", { name: "Patron requests" }).click();
	await openWizard(page);
	await submit(page, "CSV");
	await expect(page.getByRole("dialog", { name: "Exporting data" })).toBeVisible();

	await page.goBack();

	await aborted;
	expect(downloads).toHaveLength(0);
});

test("an export that matches nothing downloads nothing, and says so", async ({ app, page }) => {
	await mockExport(app, {
		patronRequests: { totalSize: 0, pageable: { number: 0, offset: 0 }, content: [] },
	});
	const downloads: Download[] = [];
	page.on("download", (download) => downloads.push(download));
	await page.goto("/patronRequests");
	await openWizard(page);
	await submit(page, "CSV");

	await expect(page.getByText("No requests match, so there was nothing to export.")).toBeVisible();
	expect(downloads).toHaveLength(0);
});

test("asks for the patron's barcode only when its column is chosen", async ({ app, page }) => {
	await mockExport(app);
	const sent = await recordExportQueries(page);
	await page.goto("/patronRequests");
	const dialog = await openWizard(page);
	await dialog.getByRole("button", { name: "Clear all" }).click();
	await dialog.getByRole("checkbox", { name: "Status", exact: true }).check();
	await dialog.getByRole("button", { name: "Export", exact: true }).click();

	await expect.poll(() => sent.length).toBeGreaterThan(0);
	expect(sent[0].withBarcode).toBe(false);
});

test.describe("an export that fails part-way", () => {
	const firstPage = {
		patronRequests: {
			totalSize: 150,
			pageable: { number: 0, offset: 0 },
			content: Array.from({ length: 100 }, (_, index) =>
				request(`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, {
					suppliers: [{ localAgency: AGENCY_CODE }],
				}),
			),
		},
	};

	const failSecondPage = async (page: Page, failure: (route: Route) => Promise<void>) =>
		page.route(`${API_BASE}/graphql`, async (route: Route) => {
			const body = route.request().postDataJSON();
			if (body?.operationName !== "LoadPatronRequestsForExport") return route.fallback();
			if (body.variables.pageno === 0) return route.fulfill({ json: { data: firstPage } });
			return failure(route);
		});

	test.beforeEach(async ({ app }) => {
		await mockExport(app);
	});

	test("downloads nothing, and says so with the server's status until dismissed", async ({
		page,
	}) => {
		await page.clock.install();
		await failSecondPage(page, (route) =>
			route.fulfill({ status: 500, json: { errors: [{ message: "boom" }] } }),
		);
		const downloads: Download[] = [];
		page.on("download", (download) => downloads.push(download));
		await page.goto("/patronRequests");
		await openWizard(page);
		await submit(page, "CSV");

		const alert = page.getByRole("alert").filter({ hasText: "The export failed" });
		await expect(alert).toContainText(
			"The export failed (the server answered 500), so nothing was downloaded. Try again.",
		);
		await expect(page.getByRole("dialog", { name: "Exporting data" })).toBeHidden();
		// An error waits to be dismissed: past the 6 seconds a success message stays for
		await page.clock.runFor(10_000);
		await expect(alert).toBeVisible();
		expect(downloads).toHaveLength(0);
	});

	test("with no answer at all, says it failed without a status", async ({ page }) => {
		await failSecondPage(page, (route) => route.abort("connectionreset"));
		await page.goto("/patronRequests");
		await openWizard(page);
		await submit(page, "CSV");

		await expect(page.getByRole("alert").filter({ hasText: "The export failed" })).toHaveText(
			/The export failed, so nothing was downloaded\. Try again\./,
		);
	});
});
