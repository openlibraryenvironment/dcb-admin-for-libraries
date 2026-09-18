import { test, expect } from "./fixtures/test";
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
		path: "/settings",
		title: /^Settings · DCB Admin for Libraries$/,
		mocks: { LoadLibrary: library },
	},
];

for (const page_ of PAGES) {
	test(`${page_.path} titles itself`, async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL(page_.mocks);
		await page.goto(page_.path);
		await expect(page).toHaveTitle(page_.title);
	});
}

test("the title changes when the route does", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library, LoadMappings: mappings });

	await page.goto("/contacts");
	await expect(page).toHaveTitle(/^Contacts/);

	await page.getByRole("tab", { name: /^mappings$/i }).click();
	await expect(page).toHaveTitle(/^Mappings/);
});
