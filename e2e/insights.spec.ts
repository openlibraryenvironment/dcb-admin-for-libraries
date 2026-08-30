import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * Library insights.
 *
 * Two properties matter here and neither is visible in a screenshot:
 *
 *  1. The page is gated on VITE_FEATURE_INSIGHTS, because it calls statistics
 *     endpoints that only exist in the upcoming dcb-service release. Hiding the
 *     tab is not enough - the URL is typeable.
 *  2. The library it reports on comes from the access token's agency claim, and
 *     from nowhere else. This app has no library picker and must never grow one.
 *     dcb-service's StatsScopeGuard now checks the requested code against the
 *     token rather than trusting it, so a mismatch is refused - but this app must
 *     still never ASK for a library it was not given, because the request it sends
 *     is what a reviewer reads to decide whether the client is honest.
 */

/**
 * The name dcb-service binds - see LIBRARY_CODE_PARAM in src/helpers/statsApi.ts. A literal
 * rather than an import so this asserts the wire format independently of the code that
 * produces it; if the two drift, that is exactly what this should catch.
 */
const LIBRARY_PARAM = "requestedLibraryCode";

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

/**
 * The two Insights endpoints the HOME page calls on its own account.
 *
 * TopTitlesSummary and TopRequestorsSummary are rendered by
 * routes/__authenticated/index.tsx - the page the flag guard redirects to - and
 * both call /insights/... regardless of the feature flag. So "did the insights
 * route leak a statistics call" cannot be asked by matching /insights/ alone: the
 * destination page answers it for you, a few milliseconds later.
 *
 * That is what made the flag-off test flaky rather than wrong. It asserted
 * immediately after the redirect, so whether those two calls had left yet was a
 * race - lost about one full-suite run in twenty-five, and never reproducible in
 * isolation, at --repeat-each, or across four workers.
 */
const HOME_PAGE_ENDPOINTS = [
	"/insights/top-requestors",
	"/insights/top-requested-titles",
];

/**
 * Collects every statistics call the page makes, in order. Attach before goto.
 *
 * `ignore` takes endpoints a DIFFERENT page legitimately calls, and is not the
 * default: on the insights route itself every /insights/ call is the dashboard's,
 * and the scoping tests below have to see all of them.
 */
function trackStatsRequests(
	page: import("@playwright/test").Page,
	ignore: string[] = [],
): URL[] {
	const seen: URL[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (!url.pathname.includes("/insights/")) return;
		if (ignore.some((endpoint) => url.pathname.endsWith(endpoint))) return;
		seen.push(url);
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

		const statsRequests = trackStatsRequests(page, HOME_PAGE_ENDPOINTS);

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

	// Pins the behaviour that made the test above flaky, so the exclusion list has
	// a reason on the record rather than only a comment. It also states a product
	// fact worth knowing: the flag gates the DASHBOARD, not these two summary
	// cards, so an environment whose dcb-service predates /insights shows two
	// failing cards on the home page whatever the flag says. If the cards are ever
	// gated too, this test fails and HOME_PAGE_ENDPOINTS can go.
	test("the home page calls Insights whether or not the flag is on", async ({
		page,
		app,
	}) => {
		await app.signIn();
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const statsRequests = trackStatsRequests(page);

		await page.goto("/");

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
