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

test.describe("Today's optional parts", () => {
	const OPTIONAL_HEADINGS = [
		"Collecting at your locations for other libraries",
		"By library",
		"Notices to your patrons",
		"Your last 7 days",
		"Getting your library ready",
	];

	test("none of them shows while its flag is off", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		for (const name of OPTIONAL_HEADINGS) {
			await expect(page.getByRole("heading", { name })).toHaveCount(0);
		}
		await expect(page.getByRole("group", { name: "Count changes over" })).toHaveCount(0);
		await expect(page.getByText(/than the same time last week/)).toHaveCount(0);
	});

	test("since your last visit: counts from the visit before this one, in the URL", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.enableFeatures(["VITE_FEATURE_TODAY_SINCE_LAST_VISIT"]);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");

		// A first visit has nothing to count from
		await expect(page.getByRole("button", { name: "Since your last visit" })).toBeDisabled();
		await expect(
			page.getByText("No earlier visit is recorded in this browser yet."),
		).toBeVisible();

		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString();
		await page.evaluate((lastSeen) => {
			const key = Object.keys(localStorage).find((k) => k.endsWith(":todayVisits"))!;
			localStorage.setItem(key, JSON.stringify({ lastSeen, previous: null }));
		}, twoDaysAgo);
		await page.reload();

		await page.getByRole("button", { name: "Since your last visit" }).click();

		await expect(page).toHaveURL(/window=visit/);
		await expect(page.getByRole("heading", { level: 2 })).toContainText([
			"Problems since your last visit",
			"Since your last visit",
		]);
		expect(sent.LoadTodayCounts.at(-1)!.placed).toContain(`dateCreated:[${twoDaysAgo} TO *]`);
	});

	test("last week: each windowed count says how it compares", async ({ app, page }) => {
		const sent = recordVariables(page);
		await app.enableFeatures(["VITE_FEATURE_TODAY_LAST_WEEK"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadTodayLastWeek: todayCounts({
				failedBorrowed: 0,
				failedSupplied: 0,
				unfilled: 4,
				placed: 1000,
				received: 18,
			}),
		});
		await page.goto("/");

		await expect(page.getByText("234 more than the same time last week")).toBeVisible();
		await expect(page.getByText("1 more than the same time last week")).toBeVisible();
		await expect(page.getByText("2 fewer than the same time last week")).toBeVisible();
		await expect(page.getByText("The same as this time last week")).toHaveCount(2);
		// Closed at both ends, a week back from the span counted
		expect(sent.LoadTodayLastWeek[0].placed).toMatch(/dateCreated:\[\S+ TO \S+Z\]/);
	});

	test("the setup checklist appears only for a library that has never borrowed or supplied", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_TODAY_SETUP_CHECKLIST"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadTodayHistory: todayCounts({ borrowed: 0, supplied: 0 }),
		});
		await page.goto("/");

		const checklist = page.getByRole("region", { name: "Getting your library ready" });
		await expect(checklist).toBeVisible();
		await expect(checklist.getByRole("listitem")).toHaveCount(4);
		await expect(
			checklist.getByRole("link", { name: "Open your library's profile" }),
		).toBeVisible();

		await app.mockGraphQL({
			LoadLibrary: library,
			LoadTodayHistory: todayCounts({ borrowed: 3, supplied: 0 }),
		});
		await page.reload();
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Getting your library ready" }),
		).toHaveCount(0);
	});

	test("Insights tiles need both Today's flag and Insights", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_TODAY_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await app.mockStats();
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByRole("heading", { name: "Your last 7 days" })).toHaveCount(0);

		await app.enableFeatures(["VITE_FEATURE_TODAY_INSIGHTS", "VITE_FEATURE_INSIGHTS"]);
		await page.goto("/");

		const tiles = page.getByRole("region", { name: "Your last 7 days" });
		await expect(tiles.getByText("Requests resolved")).toBeVisible();
		await expect(tiles.getByText("Items I supplied")).toBeVisible();
		await expect(tiles.getByRole("link", { name: "More in Insights" })).toHaveAttribute(
			"href",
			/\/insights\?range=7d$/,
		);
	});

	test("notices show what patrons can see now, and need announcements on", async ({
		app,
		page,
	}) => {
		const now = Date.now();
		const day = 24 * 3_600_000;
		const notice = (id: string, headline: string, from: number, to: number) => ({
			id,
			headline,
			body: "",
			urgent: false,
			dismissible: true,
			startsAt: new Date(now + from * day).toISOString(),
			expiresAt: new Date(now + to * day).toISOString(),
		});
		await app.enableFeatures([
			"VITE_FEATURE_TODAY_ANNOUNCEMENTS",
			"VITE_FEATURE_ANNOUNCEMENTS",
		]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadAnnouncements: {
				announcements: [
					notice("live", "Closed on Monday", -1, 3),
					notice("ended", "Summer hours", -30, -1),
				],
			},
		});
		await page.goto("/");

		const notices = page.getByRole("region", { name: "Notices to your patrons" });
		await expect(notices.getByText("1 notice is live:")).toBeVisible();
		await expect(notices.getByText(/^Closed on Monday — until /)).toBeVisible();
		await expect(notices.getByText(/Summer hours/)).toHaveCount(0);
		await expect(notices.getByRole("link", { name: "Manage notices" })).toBeVisible();
	});

	test("by library: each of a user's libraries, counted alike, with agency scoping on", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.enableFeatures([
			"VITE_FEATURE_TODAY_LIBRARY_SPLIT",
			"VITE_FEATURE_AGENCY_SCOPED_REQUESTS",
		]);
		await app.signIn({ agencyCode: "e2e-agency,second-agency" });
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryNames: {
				libraries: {
					content: [
						{ id: "1", fullName: "E2E Test Library", agencyCode: "e2e-agency" },
						{ id: "2", fullName: "Second Library", agencyCode: "second-agency" },
					],
				},
			},
			LoadTodayCounts: (variables) =>
				todayCounts({
					...DEFAULT_TODAY_TOTALS,
					readyForPickup: String(variables.readyForPickup).includes("second-agency")
						? 9
						: 4,
				}),
		});
		await page.goto("/");

		const table = page.getByRole("table", { name: "By library" });
		await expect(table.getByRole("row")).toHaveCount(3);
		await expect(
			table.getByRole("row", { name: /Second Library/ }).getByRole("cell").first(),
		).toHaveText("9");
		expect(
			sent.LoadTodayCounts.some((v) =>
				v.readyForPickup.startsWith("patronAgencyCode:second-agency"),
			),
		).toBe(true);
	});

	test("by library is off without agency scoping, where co-tenants would all count the same", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_TODAY_LIBRARY_SPLIT"]);
		await app.signIn({ agencyCode: "e2e-agency,second-agency" });
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByRole("heading", { name: "By library" })).toHaveCount(0);
	});

	test("collections at your locations count other libraries' patrons, on 8.71.0 only", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.enableFeatures(["VITE_FEATURE_TODAY_PICKUP_HERE"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadAgencyLocationsForExport: {
				agencies: {
					totalSize: 1,
					content: [{ code: "e2e-agency", locations: [{ id: "loc-1" }] }],
				},
			},
			LoadTodayPickupHere: todayCounts({ ready: 5, arriving: 2 }),
		});
		await page.goto("/");

		const here = page.getByRole("region", {
			name: "Collecting at your locations for other libraries",
		});
		await expect(
			here.getByText("requests ready for other libraries' patrons to collect"),
		).toBeVisible();
		await expect(here.getByText("5", { exact: true })).toBeVisible();
		await expect(here.getByRole("link")).toHaveCount(0);
		expect(sent.LoadTodayPickupHere[0].ready).toBe(
			'pickupLocationCode:("loc-1") AND status:READY_FOR_PICKUP AND NOT (patronHostlmsCode:e2e-lms)',
		);

		await app.enableFeatures([
			"VITE_FEATURE_TODAY_PICKUP_HERE",
			"VITE_FEATURE_AGENCY_SCOPED_REQUESTS",
		]);
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Collecting at your locations for other libraries" }),
		).toHaveCount(0);
	});
});
