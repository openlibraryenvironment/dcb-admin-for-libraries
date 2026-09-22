import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

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
