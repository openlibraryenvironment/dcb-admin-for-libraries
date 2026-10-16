import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import { DEFAULT_HOME_TOTALS, homeCounts } from "./fixtures/home";
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

test.describe("Home", () => {
	test("welcomes, then says what is in progress and what changed, one heading per section", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");

		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Welcome to DCB Admin for E2E Test Library",
		);
		await expect(page.getByText(/^DCB Admin for Libraries is the\s+portal/)).toBeVisible();
		await expect(page.getByRole("heading", { level: 2 })).toHaveText([
			"In progress now",
			"Problems today",
			"New today",
		]);
		await expect(page.getByText(/^Counted from .+ to .+\.$/)).toBeVisible();
		await expect(tile(page, /^4 requests ready for your patrons to collect$/)).toBeVisible();
		await expect(tile(page, /^1,234 requests placed by your patrons$/)).toBeVisible();
		await expect(page.getByRole("tab", { name: "Home" })).toHaveAttribute(
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
			sent.LoadHomeCounts[0].readyForPickup,
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

		await tile(page, /requests placed by your patrons$/).click();

		await expect.poll(() => sent.LoadPatronRequests?.length ?? 0).toBeGreaterThan(0);
		expect(sent.LoadPatronRequests.at(-1)!.query).toBe(sent.LoadHomeCounts[0].placed);
		// Closed at the moment counted, so the grid shows exactly the rows counted
		expect(sent.LoadHomeCounts[0].placed).toMatch(/dateCreated:\[\S+Z TO \S+Z\]/);
	});

	test("today, the last 7 days or the last 30 days, kept in the URL", async ({ app, page }) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		const choice = page.getByRole("group", { name: "Count changes over" });
		await expect(choice.getByRole("button", { name: "Today" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(choice.getByRole("button", { name: "Since your last visit" })).toHaveCount(0);

		await choice.getByRole("button", { name: "Last 30 days" }).click();

		await expect(page).toHaveURL(/window=month/);
		await expect(page.getByRole("heading", { level: 2 })).toHaveText([
			"In progress now",
			"Problems in the last 30 days",
			"New in the last 30 days",
		]);
		await expect.poll(() => sent.LoadHomeCounts.length).toBe(2);
		const from = sent.LoadHomeCounts[1].placed.match(/dateCreated:\[(\S+) TO /)![1];
		const days = (Date.now() - Date.parse(from)) / (24 * 3_600_000);
		expect(Math.round(days)).toBe(30);
		// What is in progress has no window, whichever is chosen
		expect(sent.LoadHomeCounts[1].readyForPickup).toBe(sent.LoadHomeCounts[0].readyForPickup);

		await page.reload();
		await expect(choice.getByRole("button", { name: "Last 30 days" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
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

		const legacy = sent.LoadHomeCounts[0];
		expect(legacy.readyForPickup).toMatch(/^patronHostlmsCode:e2e-lms AND /);
		// Escaped as the supplier grid has always sent it
		expect(legacy.notYetSent).toMatch(/^supplyingAgencyCode:e2e\\-agency AND /);

		await app.enableFeatures(["VITE_FEATURE_AGENCY_SCOPED_REQUESTS"]);
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		expect(sent.LoadHomeCounts.at(-1)!.readyForPickup).toMatch(
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
			LoadHomeCounts: homeCounts({ ...DEFAULT_HOME_TOTALS, unfilled: null }),
		});
		await page.goto("/");

		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(
			page.getByText("requests you were supplying stopped with an error"),
		).toBeVisible();
		await expect(tile(page, /requests you were supplying stopped/)).toHaveCount(0);
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
			fail && route.request().postDataJSON()?.operationName === "LoadHomeCounts"
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

	test("refreshing counts again, and keeping focus on the button", async ({ app, page }) => {
		const sent = recordVariables(page);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();

		const refresh = page.getByRole("button", { name: "Refresh counts" });
		await refresh.focus();
		await page.keyboard.press("Enter");

		await expect.poll(() => sent.LoadHomeCounts.length).toBe(2);
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(refresh).toBeFocused();
	});

	test("a library that cannot be loaded says so, rather than counting for ever", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		let fail = true;
		await page.route(`${API_BASE}/graphql`, (route) =>
			fail && route.request().postDataJSON()?.operationName === "LoadLibrary"
				? route.fulfill({ json: { data: null, errors: [{ message: "unavailable" }] } })
				: route.fallback(),
		);
		await page.goto("/");

		await expect(page.getByRole("alert")).toContainText(
			"The request counts could not be loaded.",
		);

		fail = false;
		await page.getByRole("button", { name: "Try again" }).click();
		await expect(tile(page, /ready for your patrons to collect/)).toBeVisible();
		// The alert that held focus is gone; focus is on what replaced it
		await expect(page.getByText(/^Counted from /)).toBeFocused();
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

test.describe("Home's optional parts", () => {
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
		await expect(page.getByRole("button", { name: "Since your last visit" })).toHaveCount(0);
		await expect(page.getByText(/than the same time last week/)).toHaveCount(0);
	});

	test("since your last visit: counts from the visit before this one, in the URL", async ({
		app,
		page,
	}) => {
		const sent = recordVariables(page);
		await app.enableFeatures([
			"VITE_FEATURE_HOME_SINCE_LAST_VISIT",
			"VITE_FEATURE_HOME_LAST_WEEK",
		]);
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
			const key = Object.keys(localStorage).find((k) => k.endsWith(":homeVisits"))!;
			localStorage.setItem(key, JSON.stringify({ lastSeen, previous: null }));
		}, twoDaysAgo);
		await page.reload();

		await page.getByRole("button", { name: "Since your last visit" }).click();

		await expect(page).toHaveURL(/window=visit/);
		await expect(page.getByRole("heading", { level: 2 })).toContainText([
			"Problems since your last visit",
			"New since your last visit",
		]);
		expect(sent.LoadHomeCounts.at(-1)!.placed).toContain(`dateCreated:[${twoDaysAgo} TO `);
		// Since a visit up to 30 days ago, a week earlier would overlap the span itself
		await expect(page.getByText(/than the same time last week/)).toHaveCount(0);
	});

	test("last week: each windowed count says how it compares", async ({ app, page }) => {
		const sent = recordVariables(page);
		await app.enableFeatures(["VITE_FEATURE_HOME_LAST_WEEK"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadHomeLastWeek: homeCounts({
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
		await expect(page.getByText("No change from the same time last week")).toHaveCount(2);
		// Closed at both ends, a week back from the span counted
		expect(sent.LoadHomeLastWeek[0].placed).toMatch(/dateCreated:\[\S+ TO \S+Z\]/);

		await page.getByRole("button", { name: "Last 7 days" }).click();
		await expect(page.getByText("234 more than the 7 days before")).toBeVisible();

		// A week earlier would overlap 30 days
		await page.getByRole("button", { name: "Last 30 days" }).click();
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByText(/than the (same time last week|7 days before)/)).toHaveCount(0);
	});

	test("the setup checklist appears only for a library that has never borrowed or supplied", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_HOME_SETUP_CHECKLIST"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadHomeHistory: homeCounts({ borrowed: 0, supplied: 0 }),
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
			LoadHomeHistory: homeCounts({ borrowed: 3, supplied: 0 }),
		});
		await page.reload();
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Getting your library ready" }),
		).toHaveCount(0);
	});

	test("Insights tiles need both the home page flag and Insights", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_HOME_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
		await app.mockStats();
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(page.getByRole("heading", { name: "Your last 7 days" })).toHaveCount(0);

		await app.enableFeatures(["VITE_FEATURE_HOME_INSIGHTS", "VITE_FEATURE_INSIGHTS"]);
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
			"VITE_FEATURE_HOME_ANNOUNCEMENTS",
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
			"VITE_FEATURE_HOME_LIBRARY_SPLIT",
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
			LoadHomeCounts: (variables) =>
				homeCounts({
					...DEFAULT_HOME_TOTALS,
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
			sent.LoadHomeCounts.some((v) =>
				v.readyForPickup.startsWith("patronAgencyCode:second-agency"),
			),
		).toBe(true);
	});

	test("by library is off without agency scoping, where co-tenants would all count the same", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_HOME_LIBRARY_SPLIT"]);
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
		await app.enableFeatures(["VITE_FEATURE_HOME_PICKUP_HERE"]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadAgencyLocationsForExport: {
				agencies: {
					totalSize: 1,
					content: [{ code: "e2e-agency", locations: [{ id: "loc-1" }] }],
				},
			},
			LoadHomePickupHere: homeCounts({ ready: 5, arriving: 2 }),
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
		expect(sent.LoadHomePickupHere[0].ready).toBe(
			'pickupLocationCode:("loc-1") AND status:READY_FOR_PICKUP AND NOT (patronHostlmsCode:e2e-lms)',
		);

		await app.enableFeatures([
			"VITE_FEATURE_HOME_PICKUP_HERE",
			"VITE_FEATURE_AGENCY_SCOPED_REQUESTS",
		]);
		await page.goto("/");
		await expect(page.getByText(/^Counted from /)).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Collecting at your locations for other libraries" }),
		).toHaveCount(0);
	});
});

test("a sign-in with no library names no library, rather than the first one found", async ({
	app,
	page,
}) => {
	await app.signIn({ agencyCode: "" });
	const asked: string[] = [];
	await app.mockGraphQL({
		LoadLibrary: (variables: Record<string, unknown>) => {
			asked.push(String(variables.query));
			return library;
		},
		LoadLibraryBasics: library,
	});

	await page.goto("/");
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

	expect(asked).not.toContain("agencyCode:");
	await expect(page.getByRole("heading", { level: 1 })).not.toContainText("E2E Test Library");
});

test("while the library is unknown, Home is headed Home, not an unfinished welcome", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: { libraries: { totalSize: 0, content: [] } },
		LoadLibraryBasics: library,
	});

	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Home");
});
