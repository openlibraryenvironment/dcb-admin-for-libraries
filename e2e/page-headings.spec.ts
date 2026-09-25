import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import type { OperationMocks } from "./fixtures/graphql";

// Nine authenticated routes had no h1 at all, and the library profile opened
// straight into variant="h3" section titles. A page with no top-level heading
// gives a screen-reader user nothing to orient by and no way in. WCAG 1.3.1.

interface Surface {
	name: string;
	path: string;
	heading: RegExp;
	mocks: OperationMocks;
}

const SURFACES: Surface[] = [
	{
		name: "library profile",
		path: "/",
		heading: /information for/i,
		mocks: {
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		},
	},
	{
		name: "mappings",
		path: "/mappings",
		heading: /^mappings$/i,
		mocks: { LoadLibrary: library, LoadMappings: mappings },
	},
	{
		name: "patron requests",
		path: "/patronRequests",
		heading: /^patron requests$/i,
		mocks: {
			LoadLibrary: library,
			LoadLibraries: library,
			LoadPatronRequests: patronRequests,
		},
	},
	{
		name: "contacts",
		path: "/contacts",
		heading: /^contacts$/i,
		mocks: { LoadLibrary: library },
	},
	{
		name: "data change log",
		path: "/dataChangeLog",
		heading: /^data change log$/i,
		mocks: { LoadLibrary: library },
	},
];

for (const surface of SURFACES) {
	test(`${surface.name} has exactly one h1, and it names the page`, async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL(surface.mocks);
		await page.goto(surface.path);

		const h1 = page.getByRole("heading", { level: 1 });
		await expect(h1).toHaveCount(1);
		await expect(h1).toHaveText(surface.heading);
	});
}
