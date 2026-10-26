import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };
import polarisLibrary from "./fixtures-data/library-polaris.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };

/** Placed by, connection checks and request limits: docs/library-details.md. */

const withLastPing = (first: unknown, second: unknown) => {
	const copy = structuredClone(polarisLibrary);
	const content = copy.libraries.content[0] as Record<string, any>;
	content.agency.hostLms.lastPing = first;
	if (content.secondHostLms) content.secondHostLms.lastPing = second;
	return copy;
};

const withLocalHolds = (maxLocalHolds: number | null) => {
	const copy = structuredClone(library);
	(copy.libraries.content[0].agency as Record<string, unknown>).maxLocalHolds = maxLocalHolds;
	return copy;
};

test.describe("Placed by", () => {
	test("says whether staff or the patron placed a request, where the service records it", async ({
		app,
		page,
	}) => {
		const documents: string[] = [];
		const placed = structuredClone(sparse);
		(placed.patronRequests.content[0] as Record<string, unknown>).placedByStaff = true;
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadHostLms: { hostLms: { content: [] } },
			LoadPatronRequest: placed,
		});
		page.on("request", (sent) => {
			if (sent.postDataJSON?.()?.operationName === "LoadPatronRequest") {
				documents.push(String(sent.postDataJSON().query));
			}
		});

		const url = `/patronRequests/${sparse.patronRequests.content[0].id}`;
		await page.goto(url);
		// Rendered with the request's own data, so a count of none below is not a race
		await expect(page.getByText("Request created", { exact: true })).toBeVisible();
		await expect(page.getByText("Placed by", { exact: true })).toHaveCount(0);
		expect(documents.at(-1)).not.toContain("placedByStaff");

		await app.enableFeatures(["VITE_FEATURE_PLACED_BY_STAFF"]);
		await page.goto(url);
		await expect(page.getByText("Placed by", { exact: true })).toBeVisible();
		await expect(page.getByText("Staff", { exact: true })).toBeVisible();
		expect(documents.at(-1)).toContain("placedByStaff");
	});
});

test.describe("Connection check", () => {
	test("shows each system's last check, and what to do about a failure", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_HOST_LMS_PROBES"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibraryServiceConfig: withLastPing(
				{ status: "ERROR", failure: "REFUSED", checkedAt: "2026-10-26T10:00:00Z", lastOkAt: "2026-10-20T08:00:00Z" },
				{},
			),
		});

		await page.goto("/service");
		const refused = page.getByRole("alert").filter({ hasText: "Refused DCB's credentials" });
		await expect(refused).toBeVisible();
		await expect(refused).toContainText("Ask your consortium's DCB support to update them.");
		await expect(refused).toContainText(/Last worked 2026-10-20/);
		// The second system answered {}: not this library's to see
		await expect(page.getByText("No check recorded")).toBeVisible();
		await app.expectNoAccessibilityViolations();
	});

	test("is absent while the service does not offer it", async ({ app, page }) => {
		const documents: string[] = [];
		await app.signIn();
		await app.mockGraphQL({ LoadLibraryServiceConfig: polarisLibrary });
		page.on("request", (sent) => {
			if (sent.postDataJSON?.()?.operationName === "LoadLibraryServiceConfig") {
				documents.push(String(sent.postDataJSON().query));
			}
		});

		await page.goto("/service");
		await expect(page.getByText("E2E Second Host LMS").first()).toBeVisible();
		await expect(page.getByText("Connection check")).toHaveCount(0);
		expect(documents.at(-1)).not.toContain("lastPing");
	});
});

test.describe("Request limits", () => {
	test("show DCB's limit and the library system's, and say when one is not set", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_LOCAL_HOLDS"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: withLocalHolds(null),
			LoadLibraryBasics: library,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		});

		await page.goto("/library");
		const active = page.getByText("Maximum active requests per patron", { exact: true });
		await expect(active).toBeVisible();
		await expect(page.getByText("10", { exact: true })).toBeVisible();
		await expect(page.getByText("Maximum holds per patron at your library system", { exact: true })).toBeVisible();
		await expect(page.getByText("Not set: DCB does not check it")).toBeVisible();
	});

	test("leave out the library system's limit while the service does not record it", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		});

		await page.goto("/library");
		await expect(page.getByText("Maximum active requests per patron", { exact: true })).toBeVisible();
		await expect(page.getByText("Maximum holds per patron at your library system", { exact: true })).toHaveCount(0);
	});
});

test.describe("Administrators only", () => {
	for (const path of ["/library", "/service"]) {
		test(`read-only staff never see the limits or the connection check on ${path}`, async ({ app, page }) => {
			await app.enableFeatures(["VITE_FEATURE_HOST_LMS_PROBES", "VITE_FEATURE_LOCAL_HOLDS"]);
			await app.signIn({ roles: READ_ONLY_ROLES });
			await app.mockGraphQL({
				LoadLibrary: withLocalHolds(5),
				LoadLibraryServiceConfig: withLastPing({ status: "OK", checkedAt: "2026-10-26T10:00:00Z" }, {}),
			});

			await page.goto(path);

			await expect(page).toHaveURL(/\/requesting/);
			await expect(page.getByText("Maximum active requests per patron")).toHaveCount(0);
			await expect(page.getByText("Connection check")).toHaveCount(0);
		});
	}
});
