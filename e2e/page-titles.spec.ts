import { test, expect } from "./fixtures/test";
import { covers } from "./fixtures/coverage";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import type { OperationMocks } from "./fixtures/graphql";

// index.html set the title once and nothing in src/ ever changed it, so all 27
// routes shared one. Browser history, tab switching and a screen reader's page
// announcement were identical everywhere. WCAG 2.4.2.

interface Titled {
	path: string;
	title: RegExp;
	mocks: OperationMocks;
}

const PAGES: Titled[] = [
	{
		path: "/mappings",
		title: /^Mappings · DCB Admin for Libraries$/,
		mocks: { LoadLibrary: library, LoadMappings: mappings },
	},
	{
		path: "/contacts",
		title: /^Contacts · DCB Admin for Libraries$/,
		mocks: { LoadLibrary: library },
	},
	{
		path: "/preferences",
		title: /^Preferences · DCB Admin for Libraries$/,
		mocks: { LoadLibrary: library },
	},
];

for (const page_ of PAGES) {
	test(`${page_.path} titles itself`, covers(`The ${page_.path} page has its own title in the browser tab.`, ["2.4.2"]), async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL(page_.mocks);
		await page.goto(page_.path);
		await expect(page).toHaveTitle(page_.title);
	});
}

// Outside the authenticated layout, so each has to be its own main landmark too.
const BARE_PAGES = [
	{ path: "/maintenance", title: /^Maintenance in progress · DCB Admin for Libraries$/ },
	{ path: "/networkError", title: /^Network error detected · DCB Admin for Libraries$/ },
];

for (const bare of BARE_PAGES) {
	test(`${bare.path} titles itself and is a main landmark`, covers(`The ${bare.path} page has its own title in the browser tab, and marks out its main content.`, ["2.4.2", "1.3.1"]), async ({ page }) => {
		await page.goto(bare.path);
		await expect(page).toHaveTitle(bare.title);
		await expect(page.getByRole("main")).toHaveCount(1);
	});
}

test("the title changes when the route does", covers("The browser tab's title changes when you move to another page.", ["2.4.2"]), async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadMappings: mappings });

	await page.goto("/contacts");
	await expect(page).toHaveTitle(/^Contacts/);

	await page.getByRole("tab", { name: /^mappings$/i }).click();
	await expect(page).toHaveTitle(/^Mappings/);
});
