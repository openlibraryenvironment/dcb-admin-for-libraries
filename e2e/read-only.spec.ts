import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * A LIBRARY_READ_ONLY user may use the requesting branch, their own preferences and
 * the accessibility statement, and nothing else. The
 * guard used to live in a useEffect on the layout, which renders the protected
 * page first and corrects afterwards.
 */
const readOnlyOn = async (
	app: import("./fixtures/test").AppFixture,
	page: import("@playwright/test").Page,
	path: string,
) => {
	await app.signIn({ roles: READ_ONLY_ROLES });
	// The pages the guard is supposed to prevent: if one of them appears in a run,
	// the guard let a loader through. The header's own query is a fixture default.
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
		LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		LoadPatronRequests: { patronRequests: { totalSize: 0, content: [] } },
		LoadLibraries: { libraries: { totalSize: 0, content: [] } },
	});
	await app.mockSearch();
	await page.goto(path);
};

test("is redirected away from the library profile", async ({ app, page }) => {
	await readOnlyOn(app, page, "/");
	await expect(page).toHaveURL(/\/requesting$/);
});

test("is redirected away from patron requests", async ({ app, page }) => {
	await readOnlyOn(app, page, "/patronRequests");
	await expect(page).toHaveURL(/\/requesting$/);
});

/**
 * The distinguishing assertion. An effect-based guard paints the protected page
 * and only then navigates, so its h1 exists for a frame; beforeLoad never
 * renders it at all.
 */
test("never renders the page it is redirecting away from", async ({
	app,
	page,
}) => {
	const headings: string[] = [];
	await page.exposeFunction("recordHeading", (text: string) => {
		headings.push(text);
	});
	await page.addInitScript(() => {
		new MutationObserver(() => {
			document.querySelectorAll("h1").forEach((heading) => {
				const text = heading.textContent?.trim();
				if (text) (window as any).recordHeading(text);
			});
		}).observe(document, { childList: true, subtree: true });
	});

	await readOnlyOn(app, page, "/patronRequests");
	await expect(page).toHaveURL(/\/requesting$/);

	expect(headings.join(" | ")).not.toMatch(/patron requests/i);
});

/**
 * The header loaded LoadLibrary, Host LMS clientConfig and all, on every page
 * for every role, to show one name. clientConfig carries ILS credentials.
 */
test("is never sent a Host LMS client configuration", async ({ app, page }) => {
	const bodies: string[] = [];
	page.on("request", (request) => {
		if (request.url().endsWith("/graphql")) bodies.push(request.postData() ?? "");
	});

	await readOnlyOn(app, page, "/requesting");
	await expect(page.getByText(/E2E Test Library/).first()).toBeVisible();

	expect(bodies.length).toBeGreaterThan(0);
	expect(bodies.filter((body) => body.includes("clientConfig"))).toEqual([]);
});

test("stays on the requesting page it is sent to", async ({ app, page }) => {
	await readOnlyOn(app, page, "/requesting");

	// The old predicate tested for "/requesting/" with a trailing slash, so the
	// destination of the redirect did not satisfy the rule that caused it.
	await expect(page).toHaveURL(/\/requesting$/);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("can set their own preferences, and reach the accessibility statement", async ({
	app,
	page,
}) => {
	await readOnlyOn(app, page, "/requesting");

	await page.getByRole("tab", { name: "Preferences" }).click();
	await expect(page).toHaveURL(/\/preferences$/);
	await expect(page.getByRole("heading", { level: 1, name: "Preferences" })).toBeVisible();
	await expect(page.getByRole("radiogroup").first()).toBeVisible();

	await page.getByRole("link", { name: /^accessibility/i }).click();
	await expect(page).toHaveURL(/\/accessibility$/);
});

test("a user with no library role is read-only too, and is kept off the service page", async ({
	app,
	page,
}) => {
	await app.signIn({ roles: ["CONSORTIUM_ADMIN"] });
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
	await app.mockSearch();

	await page.goto("/service");

	await expect(page).toHaveURL(/\/requesting$/);
	await expect(page.getByRole("tab", { name: "Service" })).toHaveCount(0);
});
