import { test, expect } from "../e2e/fixtures/test";
import library from "../e2e/fixtures-data/library.json" with { type: "json" };

/**
 * Navigation with the app mounted under a path prefix.
 *
 * The base belongs to exactly one owner: TanStack Router. It strips the base off
 * window.location on the way in, so `useLocation().pathname` is "/requesting",
 * and it adds the base back on the way out, so `<Link to="/requesting">` renders
 * href="/dcb-admin-for-libraries/requesting". Any code that prefixes the base
 * itself before handing a value to `to`, or that compares a base-prefixed string
 * against `pathname`, is counting the base twice - which produced a doubled
 * segment and a "Not Found" on click, and a tab strip with no indicator because
 * nothing ever matched.
 *
 * These assertions are written against the literal deployed paths for that
 * reason: a helper that built the expected URL from the same base string would
 * be capable of doubling it too, and would agree with the bug.
 */
const BASE = "/dcb-admin-for-libraries";

test.describe("Navigation under a deployment base path", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
	});

	test("tab links carry the base exactly once", async ({ page }) => {
		await page.goto(`${BASE}/`);

		const tabs = page.getByRole("tab");
		await expect(tabs.first()).toBeVisible();

		for (const tab of await tabs.all()) {
			const href = await tab.getAttribute("href");
			expect(href).not.toBeNull();
			// One base segment, at the start, and no second one after it. The
			// regression rendered "/dcb-admin-for-libraries/dcb-admin-for-libraries
			// /requesting", which passes the prefix check and fails this one.
			expect(href).toMatch(new RegExp(`^${BASE}(/|$)`));
			expect(href!.slice(BASE.length)).not.toContain(BASE);
		}
	});

	test("clicking a tab lands on the page, not on Not Found", async ({
		page,
	}) => {
		await page.goto(`${BASE}/`);

		await page.getByRole("tab", { name: "Patron requests" }).click();

		await expect(page).toHaveURL(`${BASE}/patronRequests`);
		await expect(page.getByText("Not Found")).toHaveCount(0);
		await expect(
			page.getByRole("tab", { name: "Patron requests" }),
		).toHaveAttribute("aria-selected", "true");
	});

	test("the tab for the current route is indicated on a deep link", async ({
		page,
	}) => {
		// Entered by URL rather than by clicking, which is the case a bookmark, a
		// refresh or a post-login redirect produces.
		await page.goto(`${BASE}/mappings`);

		await expect(page.getByRole("tab", { name: "Mappings" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("a nested route keeps its ancestor tab indicated", async ({ page }) => {
		await page.goto(`${BASE}/requesting/e2e-record-id`);

		// exact: the record page renders its own tab strip, which contains a
		// "Requesting history" tab.
		await expect(
			page.getByRole("tab", { name: "Requesting", exact: true }),
		).toHaveAttribute("aria-selected", "true");
	});

	test("not found routes home to the app, not to the origin root", async ({
		page,
	}) => {
		// The origin hosts other apps. "Home" from this app's not-found page has
		// to mean this app's home - a bare "/" would hand the visitor whatever is
		// mounted at the root, or nothing at all.
		await page.goto(`${BASE}/no-such-page`);

		await expect(
			page.getByRole("heading", { level: 1, name: "Page not found" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Go to the home page" }).click();

		await expect(page).toHaveURL(`${BASE}/`);
	});

	test("assets and the SPA fallback resolve under the base", async ({
		page,
	}) => {
		const failures: string[] = [];
		page.on("response", (response) => {
			if (response.status() === 404) {
				failures.push(response.url());
			}
		});

		// A deep link is the case that breaks a relative asset base: the host
		// serves index.html AT this URL, so "./assets/..." would resolve against
		// /dcb-admin-for-libraries/requesting/ and 404.
		await page.goto(`${BASE}/requesting/e2e-record-id`);
		await expect(page.getByRole("tab").first()).toBeVisible();

		expect(failures).toEqual([]);
	});
});
