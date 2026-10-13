import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import { DEFAULT_TODAY_TOTALS, todayCounts } from "./fixtures/today";
import library from "./fixtures-data/library.json" with { type: "json" };
import type { Page } from "@playwright/test";

/** Every GraphQL call's variables, by operation, in the order they were sent. */
const recordVariables = (page: Page) => {
	const sent: Record<string, Record<string, string>[]> = {};
	page.on("request", (request) => {
		if (request.url() !== `${API_BASE}/graphql`) return;
		const body = request.postDataJSON();
		(sent[body?.operationName] ??= []).push(body?.variables ?? {});
	});
	return sent;
};

const tile = (page: Page, name: RegExp) => page.getByRole("link", { name });

test.describe("Today", () => {
	test("says what waits now and what changed, under one heading per section", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");

		await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");
		await expect(page.getByRole("heading", { level: 2 })).toHaveText([
			"Waiting on you",
			"Problems in the last 24 hours",
			"In the last 24 hours",
		]);
		await expect(page.getByText(/^Counted from .+, the last 24 hours\.$/)).toBeVisible();
		await expect(tile(page, /^4 requests ready for your patrons to collect$/)).toBeVisible();
		await expect(tile(page, /^1,234 requests placed by your patrons$/)).toBeVisible();
		await expect(page.getByRole("tab", { name: "Today" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("a count opens its grid filtered to exactly what it counted", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadPatronRequests: { patronRequests: { content: [], totalSize: 0 } },
		});
		await page.goto("/");

		await tile(page, /ready for your patrons to collect/).click();

		await expect(page).toHaveURL(/\/patronRequests\?/);
		await expect.poll(() => sent.LoadPatronRequests?.length ?? 0).toBeGreaterThan(0);
		expect(sent.LoadPatronRequests.at(-1)!.query).toBe(
			sent.LoadTodayCounts[0].readyForPickup,
		);
	});

	test("a windowed count carries the window it counted into the grid", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadPatronRequests: { patronRequests: { content: [], totalSize: 0 } },
		});
		await page.goto("/");

		await tile(page, /requests placed by your patrons/).click();

		await expect.poll(() => sent.LoadPatronRequests?.length ?? 0).toBeGreaterThan(0);
		expect(sent.LoadPatronRequests.at(-1)!.query).toBe(sent.LoadTodayCounts[0].placed);
		expect(sent.LoadTodayCounts[0].placed).toMatch(/dateCreated:\[\S+ TO \*\]/);
	});

	test("counts a library's own requests the way the grids do, on 8.71.0 and after", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		const legacy = sent.LoadTodayCounts[0];
		expect(legacy.readyForPickup).toMatch(/^patronHostlmsCode:e2e-lms AND /);
		// Escaped as the supplier grid has always sent it
		expect(legacy.toSupply).toMatch(/^supplyingAgencyCode:e2e\\-agency AND /);

		await app.enableFeatures(["VITE_FEATURE_AGENCY_SCOPED_REQUESTS"]);
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		expect(sent.LoadTodayCounts.at(-1)!.readyForPickup).toMatch(
			/^patronAgencyCode:e2e-agency AND /,
		);
	});

	test("a zero is said rather than linked, and an unknown is never shown as zero", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadTodayCounts: todayCounts({ ...DEFAULT_TODAY_TOTALS, unfilled: null }),
		});
		await page.goto("/");

		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByText("requests you were supplying failed")).toBeVisible();
		await expect(tile(page, /requests you were supplying failed/)).toHaveCount(0);
		await expect(
			page.getByText("requests no library could fill: not known"),
		).toBeVisible();
		await expect(tile(page, /no library could fill/)).toHaveCount(0);
	});

	test("a failed load says so and offers to try again, with no counts shown", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		let fail = true;
		await page.route(`${API_BASE}/graphql`, (route) =>
			fail && route.request().postDataJSON()?.operationName === "LoadTodayCounts"
				? route.fulfill({ json: { data: null, errors: [{ message: "unavailable" }] } })
				: route.fallback(),
		);
		await page.goto("/");

		await expect(page.getByRole("alert")).toContainText(
			"The request counts could not be loaded.",
		);
		await expect(page).toHaveURL(/\/$/);
		await expect(tile(page, /requests/)).toHaveCount(0);

		fail = false;
		await page.getByRole("button", { name: "Try again" }).click();
		await expect(tile(page, /ready for your patrons to collect/)).toBeVisible();
	});

	test("refreshing counts again", async ({ app, page }) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		await page.getByRole("button", { name: "Refresh counts" }).click();

		await expect.poll(() => sent.LoadTodayCounts.length).toBe(2);
	});

	test("points to Insights only where Insights is on", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByRole("link", { name: /are in Insights/ })).toHaveCount(0);

		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await page.goto("/");
		await expect(page.getByRole("link", { name: /are in Insights/ })).toBeVisible();
	});
});
