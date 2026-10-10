import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/** Every statistics call the page makes. Attach before goto. */
function trackStatsRequests(page: import("@playwright/test").Page): URL[] {
	const seen: URL[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.pathname.includes("/insights/")) seen.push(url);
	});
	return seen;
}

test("an explicit window in the link is the window the statistics are asked for", async ({
	app,
	page,
}) => {
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
	await app.mockStats();
	const requests = trackStatsRequests(page);

	await page.goto("/insights?from=2026-08-01&to=2026-08-31");
	await expect(page.getByText("89.4%")).toBeVisible();

	const windowed = requests.filter((url) => url.searchParams.has("startDate"));
	expect(windowed.length).toBeGreaterThan(0);
	for (const url of windowed) {
		const startDate = url.searchParams.get("startDate") ?? "";
		const endDate = url.searchParams.get("endDate") ?? "";
		// An Instant, which is what the API binds - not the bare date in the link.
		expect(startDate).toMatch(/T\d{2}:\d{2}:\d{2}/);
		const start = await page.evaluate((iso) => {
			const d = new Date(iso);
			return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()];
		}, startDate);
		const end = await page.evaluate((iso) => {
			const d = new Date(iso);
			return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()];
		}, endDate);
		expect(start).toEqual([2026, 8, 1, 0]);
		expect(end).toEqual([2026, 8, 31, 23]);
	}
});

test("reports on the selected library when the claim names several", async ({
	app,
	page,
}) => {
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	// A comma-separated claim is how some identity providers issue a list.
	await app.signIn({ agencyCode: "e2e-agency,second-agency" });
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: (variables) =>
			variables.query === "agencyCode:e2e-agency"
				? library
				: { libraries: { totalSize: 0, content: [] } },
	});
	await app.mockStats();

	await page.goto("/insights");
	await expect(page.getByText("89.4%")).toBeVisible();
	await expect(page.getByText(/E2E Test Library/).first()).toBeVisible();
});
