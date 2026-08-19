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
 *     from nowhere else. This app has no library picker and must never grow one:
 *     dcb-service currently trusts the libraryCode query parameter, so a code
 *     that could be influenced from the client would let a library admin read
 *     another library's figures.
 */

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

/** Collects every statistics call the page makes, in order. Attach before goto. */
function trackStatsRequests(page: import("@playwright/test").Page): URL[] {
	const seen: URL[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.pathname.includes("/patrons/requests/stats/")) seen.push(url);
	});
	return seen;
}

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
		expect(statsRequests).toHaveLength(0);
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
		expect(statsRequests).toHaveLength(0);
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
			const libraryCode = url.searchParams.get("libraryCode");
			if (libraryCode !== null) {
				expect(
					libraryCode,
					`${url.pathname} asked for a library other than the caller's own`,
				).toBe("e2e-lms");
			}
		}

		// At least one call must actually be scoped - a page that scoped nothing
		// would pass the loop above vacuously.
		expect(
			statsRequests.some(
				(url) => url.searchParams.get("libraryCode") === "e2e-lms",
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
			expect(url.searchParams.get("libraryCode")).not.toBe("peer-lms");
		}
	});
});
