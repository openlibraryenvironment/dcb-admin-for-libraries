import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

// A title filter carried in from an earlier visit is what used to send an
// administrator's grid through a 100,000-row fetch, so the spec starts from one.
// Grid state is URL state now, so it arrives in a link.
const TITLE_FILTER = encodeURIComponent(
	JSON.stringify([
		{ id: 1, field: "clusterRecordTitle", operator: "contains", value: "moby" },
	]),
);

test("an administrator's borrowed-requests grid is paged by the server", async ({
	app,
	page,
}) => {
	await app.signIn({ roles: ["ADMIN"] });

	const facetRequests: string[] = [];
	const requestQueries: { operation: string; pagesize: unknown }[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/search/instances/facets")) {
			facetRequests.push(request.url());
		}
		const body = request.postDataJSON?.();
		if (/PatronRequests|BibClusterIds/.test(body?.operationName ?? "")) {
			requestQueries.push({
				operation: body.operationName,
				pagesize: body.variables?.pagesize,
			});
		}
	});
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});

	await page.goto(`/patronRequests?filters=${TITLE_FILTER}`);
	await expect(
		page.getByRole("link", { name: /2026-09-01/ }).first(),
	).toBeVisible();
	await expect(page.getByRole("progressbar")).toHaveCount(0);

	expect(requestQueries.length).toBeGreaterThan(0);
	for (const { operation, pagesize } of requestQueries) {
		expect(operation).toBe("LoadPatronRequests");
		expect(pagesize).toBeLessThanOrEqual(100);
	}
	expect(facetRequests).toEqual([]);
	await expect(
		page.getByRole("columnheader", { name: "Publisher" }),
	).toHaveCount(0);
});
