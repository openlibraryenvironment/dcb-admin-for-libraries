import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };
import { scrollUntilPresent } from "./fixtures/lazy";
import { DEFAULT_STATS } from "./fixtures/stats";

/**
 * Library insights. Two properties neither of which is visible in a
 * screenshot: the page is gated on VITE_FEATURE_INSIGHTS because the URL is
 * typeable, and the library it reports on comes from the token's agency claim
 * and nowhere else. docs/service-compatibility.md.
 */

/**
 * The name dcb-service binds - see LIBRARY_CODE_PARAM in src/helpers/statsApi.ts. A literal
 * rather than an import so this asserts the wire format independently of the code that
 * produces it; if the two drift, that is exactly what this should catch.
 */
const LIBRARY_PARAM = "requestedLibraryCode";

/** WalkUpDiversionPanel's own heading, and what proves it mounted. */
const WALK_UP_PANEL = "Collected in person, or sent";

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

/**
 * Collects every statistics call the page makes, in order. Attach before goto.
 *
 * Matching /insights/ alone is enough now that the home page's two summary cards
 * sit behind the same flag as the dashboard. It was not before: the guard
 * redirects to "/", those cards called /insights/... unconditionally, and the
 * flag-off assertion below raced them - which is how it failed about one
 * full-suite run in twenty-five while never reproducing in isolation.
 */
function trackStatsRequests(page: import("@playwright/test").Page): URL[] {
	const seen: URL[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.pathname.includes("/insights/")) seen.push(url);
	});
	return seen;
}

/** Readable in a CI log: the paths, not "[object URL]". */
const paths = (urls: URL[]) => urls.map((url) => url.pathname).join(", ");

test.describe("Library insights", () => {
	test("is unreachable while the feature flag is off", async ({
		page,
		app,
	}) => {
		// No enableFeatures() call: flags default to off, exactly as in an
		// environment whose dcb-service does not serve /stats yet.
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/insights");

		await expect(page).toHaveURL(/\/(?!insights)[^/]*$/);
		await expect(
			page.getByRole("heading", { level: 1, name: /insights/i }),
		).toHaveCount(0);

		// The redirect is thrown from beforeLoad, so the loader never runs and no
		// statistics endpoint is called at all. A guard that let the loader run
		// first would still land the user elsewhere, but would have asked an
		// environment that cannot answer - which is the thing the flag is for.
		expect(statsRequests, paths(statsRequests)).toHaveLength(0);
	});

	// The other half of the same flag. Both home-page summary cards read the
	// Insights API, so leaving them ungated defeated the flag on the page every
	// library administrator lands on first: an environment too old to serve
	// /insights still fired both calls and rendered two broken cards.
	test("the home page makes no Insights call while the flag is off", async ({
		page,
		app,
	}) => {
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/");

		// Wait for something that renders either way, so this cannot pass by
		// asserting against a page that has not finished loading yet.
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		// The two card headings, by their real names: "Your patrons' favourite
		// titles this month" and "Top requesters this month".
		await expect(
			page.getByRole("heading", { name: /favourite titles|top requesters/i }),
		).toHaveCount(0);
		expect(statsRequests, paths(statsRequests)).toHaveLength(0);
	});

	// ...and they are gated, not deleted.
	test("the home page shows the summary cards once the flag is on", async ({
		page,
		app,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/");

		await expect(
			page.getByRole("heading", { name: /favourite titles/i }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: /top requesters/i }),
		).toBeVisible();

		await expect
			.poll(() => statsRequests.map((url) => url.pathname).join(" "))
			.toContain("/insights/top-requested-titles");
		await expect
			.poll(() => statsRequests.map((url) => url.pathname).join(" "))
			.toContain("/insights/top-requestors");
	});

	test("is unreachable for a read-only user", async ({ page, app }) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn({ roles: READ_ONLY_ROLES });
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/insights");

		await expect(page).toHaveURL(/\/requesting$/);
		await expect(
			page.getByRole("heading", { level: 1, name: /insights/i }),
		).toHaveCount(0);

		// The layout also bounces read-only users, but it does so from a useEffect -
		// which renders the protected page first and corrects afterwards. Asserting
		// that nothing was fetched is what distinguishes the beforeLoad guard from
		// that fallback: an effect-only guard leaks a loader's worth of requests.
		expect(statsRequests, paths(statsRequests)).toHaveLength(0);
	});

	test("scopes every statistics call to the token's own library", async ({
		page,
		app,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/insights");
		await expect(page.getByText("89.4%")).toBeVisible();

		expect(statsRequests.length).toBeGreaterThan(0);

		// e2e-lms is library.json's agency.hostLms.code, reached only via the
		// seeded token's `code` claim (e2e-agency). Every scoped call must carry
		// it, and no call may carry anything else.
		for (const url of statsRequests) {
			const libraryCode = url.searchParams.get(LIBRARY_PARAM);
			if (libraryCode !== null) {
				expect(
					libraryCode,
					`${url.pathname} asked for a library other than the caller's own`,
				).toBe("e2e-lms");
			}
		}

		// At least one call must actually be scoped - a page that scoped nothing
		// would pass the loop above vacuously. This is also what catches the filter
		// being sent under a name the API does not bind: every call would carry
		// nothing, the loop would pass, and only this would fail.
		expect(
			statsRequests.some(
				(url) => url.searchParams.get(LIBRARY_PARAM) === "e2e-lms",
			),
		).toBe(true);
	});

	test("reports walk-up against shipped, scoped to the caller's own library", async ({
		page,
		app,
	}) => {
		// The courier saving is an assertion until it is counted. These are the
		// two numbers, and the call that fetches them must narrow like every other one -
		// this panel sits beside peer benchmarking, which is deliberately consortium-wide,
		// and the two must not be confused.
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_WALK_UP",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/insights?tab=service");

		const panel = page.getByRole("heading", { name: WALK_UP_PANEL });
		await scrollUntilPresent(page, panel);
		await expect(panel).toBeVisible();

		const row = page
			.getByRole("region", { name: WALK_UP_PANEL })
			.getByRole("row")
			.filter({ has: page.getByText("E2E Test Library", { exact: true }) });

		await expect(row).toContainText("227");
		await expect(row).toContainText("681");
		// 227 of 908. Rendered rather than computed by the API, so an arithmetic slip
		// shows up here rather than in a slide.
		await expect(row).toContainText("25.0%");

		const breakdown = statsRequests.find((url) =>
			url.pathname.endsWith("/insights/library-breakdown"),
		);
		expect(breakdown, paths(statsRequests)).toBeDefined();
		expect(breakdown!.searchParams.get(LIBRARY_PARAM)).toBe("e2e-lms");
	});

	test("names a Host LMS that is not an onboarded library by its code", async ({
		page,
		app,
	}) => {
		// Degrade honestly where there are no libraries rather than reporting zero.
		// A blank cell reads as a rendering fault; the code reads as a configuration fact.
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_WALK_UP",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		await page.goto("/insights?tab=service");

		await scrollUntilPresent(
			page, page.getByRole("heading", { name: WALK_UP_PANEL }));

		// Scoped to this panel: peer benchmarking below renders the same code in its own
		// table, and an unscoped row locator matches both.
		await expect(
			page
				.getByRole("region", { name: WALK_UP_PANEL })
				.getByRole("row")
				.filter({ hasText: "unnamed-lms" }),
		).toBeVisible();
	});

	test("says so when nothing was collected in person, rather than showing zeroes", async ({
		page,
		app,
	}) => {
		// A table of zeroes reads as a broken panel. While walk-up is not switched on,
		// zero is the correct and expected answer and the page has to say which it is.
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_WALK_UP",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats({
			"library-breakdown": [
				{
					libraryCode: "e2e-lms",
					libraryName: "E2E Test Library",
					totalRequests: 908,
					walkUpRequests: 0,
					shippedRequests: 908,
				},
			],
		});

		await page.goto("/insights?tab=service");

		await scrollUntilPresent(
			page, page.getByRole("heading", { name: WALK_UP_PANEL }));

		await expect(
			page.getByText("Walk-up collection may not be switched on yet."),
		).toBeVisible();
	});

	test("leaves walk-up out, without asking, where the endpoint is not released", async ({
		page,
		app,
	}) => {
		// Every released dcb-service answers /insights/library-breakdown 404. Through the
		// panel contract that would read as a fault; without one it read as "walk-up is off".
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/insights?tab=service");
		await scrollUntilPresent(
			page, page.getByRole("heading", { name: "Supplier responsiveness" }));

		await expect(page.getByRole("heading", { name: WALK_UP_PANEL })).toHaveCount(0);
		expect(
			statsRequests.filter((url) =>
				url.pathname.endsWith("/insights/library-breakdown")),
		).toEqual([]);
	});

	test("reports a walk-up failure as a failure, not as walk-up being off", async ({
		page,
		app,
	}) => {
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_WALK_UP",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();
		await page.route("**/insights/library-breakdown*", (route) =>
			route.fulfill({ status: 404, body: "" }),
		);

		await page.goto("/insights?tab=service");
		await scrollUntilPresent(
			page, page.getByRole("heading", { name: WALK_UP_PANEL }));

		const panel = page.getByRole("region", { name: WALK_UP_PANEL });
		await expect(panel.getByText("This panel could not be loaded")).toBeVisible();
		await expect(panel.getByRole("button", { name: "Retry" })).toBeVisible();
		await expect(panel.getByText(/may not be switched on/)).toHaveCount(0);
		await expect(panel.getByText("No requests in this period.")).toHaveCount(0);
	});

	test("does not take the library from the URL", async ({ page, app }) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		// A hand-typed search param naming someone else's library must be inert.
		await page.goto("/insights?libraryCode=peer-lms");
		await expect(page.getByText("89.4%")).toBeVisible();

		for (const url of statsRequests) {
			expect(url.searchParams.get(LIBRARY_PARAM)).not.toBe("peer-lms");
			expect(url.searchParams.get("libraryCode")).toBeNull();
		}
	});
});

/**
 * A chart is an SVG of positioned marks: a screen reader gets the axis labels at
 * best and nothing at worst, so the figures the panel exists to convey are
 * absent. Each chart now carries the same numbers as a visually hidden table.
 */
test("charts carry their numbers as a table", async ({ app, page }) => {
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
	await app.mockStats();

	await page.goto("/insights");
	await expect(
		page.getByRole("heading", { level: 1, name: /insights/i }),
	).toBeVisible();

	// The trend chart is above the fold; the rest mount on scroll and are
	// covered by the accessibility gate's own reveal.
	const table = page.getByRole("table").first();
	await expect(table).toBeAttached({ timeout: 15000 });
	await expect(table.getByRole("columnheader").first()).toBeAttached();
});

/**
 * One per chart that had no table. Region and zone are pinned so each expected value is
 * a literal rather than a second copy of the formatting the panel does.
 */
test.describe("each chart's table carries its figures", () => {
	test.use({ locale: "en-GB", timezoneId: "UTC" });

	const openSubject = async (
		app: import("./fixtures/test").AppFixture,
		page: import("@playwright/test").Page,
		subject: string,
		lastPanel: string,
		features: string[] = [],
	) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS", ...features]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();
		await page.goto(`/insights?tab=${subject}`);
		await scrollUntilPresent(page, page.getByRole("heading", { name: lastPanel }));
	};

	const row = (table: import("@playwright/test").Locator, header: string) =>
		table.getByRole("row").filter({
			has: table.page().getByRole("rowheader", { name: header, exact: true }),
		});

	test("demand by pickup location and by patron group", async ({ app, page }) => {
		await openSubject(app, page, "demand", "Demand by patron group");

		const pickup = page.getByRole("table", { name: "Demand by pickup location" });
		await expect(pickup.getByRole("columnheader")).toHaveText([
			"Pickup location",
			"Requests",
		]);
		await expect(row(pickup, "Main Library").getByRole("cell")).toHaveText([
			"512",
		]);

		const groups = page.getByRole("table", { name: "Demand by patron group" });
		await expect(groups.getByRole("columnheader")).toHaveText([
			"Patron group",
			"Requests",
		]);
		await expect(row(groups, "Undergraduate").getByRole("cell")).toHaveText([
			"488",
		]);
	});

	test("demand by day and hour", async ({ app, page }) => {
		await openSubject(app, page, "demand", "Demand by patron group");

		const heatmap = page.getByRole("table", { name: "When requests arrive" });
		const headers = heatmap.getByRole("columnheader");
		await expect(headers).toHaveCount(25);
		await expect(headers.first()).toHaveText("Day");

		const column = (await headers.allTextContents()).indexOf("14:00");
		expect(column).toBeGreaterThan(0);

		// dayOfWeek 3 in the fixture, counted from Sunday as Postgres does.
		const wednesday = row(heatmap, "Wed").getByRole("cell");
		await expect(wednesday).toHaveCount(24);
		await expect(wednesday.nth(column - 1)).toHaveText("41");
		await expect(wednesday.nth(column - 2)).toHaveText("0");
	});

	test("collection analysis, by the dimension chosen", async ({ app, page }) => {
		await openSubject(app, page, "demand", "Demand by patron group");

		const collection = page.getByRole("table", { name: "Collection analysis" });
		await expect(collection.getByRole("columnheader")).toHaveText([
			"Format",
			"Requests",
		]);
		await expect(row(collection, "Book").getByRole("cell")).toHaveText(["704"]);
	});

	test("clustering confidence and the catalogue's format mix", async ({ app, page }) => {
		await openSubject(app, page, "collection", "Who holds the same works");

		const clusters = page.getByRole("table", { name: "Clustering confidence" });
		await expect(clusters.getByRole("columnheader")).toHaveText([
			"Libraries holding the work",
			"Works",
		]);
		await expect(row(clusters, "1").getByRole("cell")).toHaveText(["1,902,311"]);
		await expect(row(clusters, "8+").getByRole("cell")).toHaveText(["400,000"]);

		const formats = page.getByRole("table", { name: "Format mix of the catalogue" });
		await expect(formats.getByRole("columnheader")).toHaveText(["Format", "Works"]);
		await expect(row(formats, "Book").getByRole("cell")).toHaveText(["512,000"]);
		await expect(row(formats, "Audiobook").getByRole("cell")).toHaveText(["64,000"]);
	});

	test("duration trends", async ({ app, page }) => {
		await openSubject(app, page, "trends", "How durations are moving", [
			"VITE_FEATURE_INSIGHTS_TRENDS",
		]);

		const durations = page.getByRole("table", {
			name: "How durations are moving",
		});
		await expect(durations.getByRole("columnheader")).toHaveText([
			"Period starting",
			"Median",
			"95th percentile",
		]);
		await expect(row(durations, "2025-11-02").getByRole("cell")).toHaveText([
			"41.7 hrs",
			"4.9 days",
		]);
	});
});

/**
 * The collection figures through the shared formatters. A region that spaces its percent
 * sign is what tells a formatter from a hand-built `${n.toFixed(1)}%`; `\s` takes either
 * no-break space, since CLDR has moved between them.
 */
test.describe("collection figures are written in the reader's region", () => {
	test.use({ locale: "fr-FR", timezoneId: "UTC" });

	test("percentages and counts follow the region", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();
		await page.goto("/insights?tab=collection");
		await scrollUntilPresent(
			page,
			page.getByRole("heading", { name: "Who holds the same works" }),
		);

		await expect(
			page.getByText(
				/^46,2\s% of 4\s120\s884 works are held by a single library\. The most common number of holders per work is 1\.$/,
			),
		).toBeVisible();

		const own = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Unique share" }) })
			.getByRole("row", { name: /e2e-lms/ })
			.getByRole("cell");
		await expect(own.nth(1)).toHaveText(/^640\s000$/);
		await expect(own.last()).toHaveText(/^13,8\s%$/);
	});

	test("walk-up counts and share follow the region", async ({ app, page }) => {
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_WALK_UP",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats({
			"library-breakdown": [
				{
					libraryCode: "e2e-lms",
					libraryName: "E2E Test Library",
					totalRequests: 1234,
					walkUpRequests: 308,
					shippedRequests: 926,
				},
			],
		});
		await page.goto("/insights?tab=service");
		await scrollUntilPresent(page, page.getByRole("heading", { name: WALK_UP_PANEL }));

		const cells = page
			.getByRole("region", { name: WALK_UP_PANEL })
			.getByRole("row", { name: /E2E Test Library/ })
			.getByRole("cell");
		await expect(cells).toHaveText([/^1\s234$/, "308", "926", /^25,0\s%$/]);
	});

	test("the trend strip's headline figures follow the region", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		// The default flow scaled by twenty: the volume needs a group separator, and every
		// ratio is unchanged.
		const flow = DEFAULT_STATS.timeseries as { count: number }[];
		await app.mockStats({
			timeseries: flow.map((r) => ({ ...r, count: r.count * 20 })),
		});
		await page.goto("/insights?tab=trends");

		// The innermost element holding both the strip's heading and its last tile.
		const strip = page
			.locator("div")
			.filter({
				has: page.getByRole("heading", { name: "Is it getting better or worse?" }),
			})
			.filter({ hasText: "Error rate" })
			.last();
		await expect(strip.getByText(/^\d\s\d{3}$/)).toHaveCount(1);
		await expect(strip.getByText(/^\d{1,2},\d\s%$/)).toHaveCount(2);
	});

	test("request counts in the title tables follow the region", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats({
			"unfillable-demand": [
				{
					clusterId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
					title: "The Lost Atlas",
					author: "M. Ortega",
					requestCount: 1500,
				},
			],
		});
		await page.goto("/insights?tab=demand");

		const titles = page.getByRole("table", { name: "Demand nothing could supply" });
		await scrollUntilPresent(page, titles);
		await expect(
			titles.getByRole("row", { name: /The Lost Atlas/ }).getByRole("cell"),
		).toHaveText(["The Lost Atlas", "M. Ortega", /^1\s500$/]);
	});
});
