import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };

test.beforeEach(async ({ app }) => {
	await app.signIn();
});

test("the borrowed-requests grid asks the shared index for nothing", async ({
	app,
	page,
}) => {
	const facetRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/search/instances/facets")) {
			facetRequests.push(request.url());
		}
	});
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});

	await page.goto("/patronRequests");
	await expect(
		page.getByRole("link", { name: /2026-09-01/ }).first(),
	).toBeVisible();
	await expect(page.getByRole("progressbar")).toHaveCount(0);
	expect(facetRequests).toEqual([]);
});

test("the supplier grid scopes its query once", async ({ app, page }) => {
	const queries: string[] = [];
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: (variables) => {
			queries.push(String(variables.query));
			return supplierRequests;
		},
	});

	await page.goto("/supplierRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	await expect.poll(() => queries.length).toBeGreaterThan(0);
	expect(queries[0]).toBe("supplyingAgencyCode:e2e-agency");
});
