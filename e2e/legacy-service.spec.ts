import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * This app against dcb-service 8.71.0 — R-19.
 *
 * <h2>What this holds shut</h2>
 *
 * `brandLogoUrl`, `brandLogoAlt` and `defaultThemeName` arrived on `Library` in
 * dcb-service 9.0.0. A GraphQL field the server has never heard of is not a null - it is
 * a validation error that fails the WHOLE operation - and `LoadLibrary` is run by the
 * header on every page and by six routes. Selecting them on an older deployment therefore
 * does not grey out a form: it takes the application down.
 *
 * `src/queries/schemaConformance.test.ts` proves the DOCUMENTS are valid. This proves the
 * APPLICATION is: the page renders, the brand fields are not offered, and - the part a
 * unit test cannot see - the request that goes over the wire does not name them.
 *
 * Every flag is off here, which is the deployed default and the state of an environment
 * that has never heard of them.
 */

/** Everything 9.0.0 added to Library, behind VITE_FEATURE_LIBRARY_BRANDING. */
const V9_ONLY_FIELDS = ["brandLogoUrl", "brandLogoAlt", "defaultThemeName"];

/**
 * What arrived AFTER the 9.0.0 tag: `supportUrl`, in V9_0_008, behind its own flag.
 *
 * Kept separate from the list above rather than merged into it, because the two lists
 * answer different questions. Both are refused by 8.71.0, so the negative test takes
 * their union — but a deployment ON 9.0.0 has one and not the other, which is the whole
 * reason they are two capabilities, and a single list would make the positive test below
 * assert something untrue of every real deployment.
 */
const POST_9_0_0_FIELDS = ["supportUrl"];

/**
 * Nothing sent to 8.71.0 may name one of these.
 *
 * `patronWebsite` is deliberately absent: Library has carried it since 5.11.1, so it is
 * selected unconditionally and 8.71.0 answers it. Adding it would make this list assert
 * the opposite of the truth.
 */
const FIELDS_8_71_0_LACKS = [...V9_ONLY_FIELDS, ...POST_9_0_0_FIELDS];

/** Collects every GraphQL request body the page sends. Attach before goto. */
function trackGraphQL(page: import("@playwright/test").Page): string[] {
	const bodies: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/graphql") && request.method() === "POST") {
			bodies.push(request.postData() ?? "");
		}
	});
	return bodies;
}

/** A GraphQL document with its `#` comment lines removed. */
const stripComments = (document: string): string =>
	document
		.split("\n")
		.filter((line) => !line.trim().startsWith("#"))
		.join("\n");

/**
 * Everything the library profile page asks for.
 *
 * LoadPatronRequestStats is here for both statistics panels - an operation with no mock
 * is aborted, and an aborted query leaves the panel spinning forever. A scan taken over
 * two perpetual spinners measures a loading state nobody sees, and reports axe violations
 * that belong to the fixture rather than to the page.
 */
const STATS = { patronRequests: { totalSize: 42 } };
const mocks = {
	LoadLibrary: library,
	LoadLibraryBasics: library,
	LoadPatronRequestStats: STATS,
	LoadSupplierRequests: STATS,
};

test.describe("dcb-service 8.71.0", () => {
	test("the library page renders, and asks for no field 8.71.0 lacks", async ({
		page,
		app,
	}) => {
		const requests = trackGraphQL(page);
		await app.signIn();
		await app.mockGraphQL(mocks);

		await page.goto("/");

		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		const loadLibrary = requests.find((body) =>
			body.includes("LoadLibrary("),
		);
		expect(loadLibrary, "LoadLibrary was never sent").toBeDefined();

		const selection = stripComments(
			(JSON.parse(loadLibrary!) as { query: string }).query,
		);
		for (const field of FIELDS_8_71_0_LACKS) {
			expect(selection, `asked 8.71.0 for ${field}`).not.toContain(field);
		}
	});

	test("the patron-facing brand block is not offered", async ({ page, app }) => {
		// Hiding the fields is UX; the document change above is what keeps the page
		// working. Both, because a form offering three fields that cannot be saved is
		// its own defect.
		await app.signIn();
		await app.mockGraphQL(mocks);

		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		await expect(
			page.getByRole("heading", { name: /how your library appears to patrons/i }),
		).toHaveCount(0);
		await expect(page.getByText(/discovery theme/i)).toHaveCount(0);
	});

	test("has no accessibility violations with the block removed", async ({
		page,
		app,
	}) => {
		// Removing a labelled block changes heading order and focus order, which is
		// exactly the kind of change a diff does not show and a scan does.
		await app.signIn();
		await app.mockGraphQL(mocks);

		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		await app.expectNoAccessibilityViolations();
	});
});

test.describe("dcb-service 9.0.0 and later", () => {
	const branded = {
		libraries: {
			...library.libraries,
			content: [
				{
					...library.libraries.content[0],
					brandLogoUrl: "https://example.invalid/logo.png",
					brandLogoAlt: "Example Library",
					defaultThemeName: "openRS",
				},
			],
		},
	};

	test("asks for every gated field once its flag is on", async ({
		page,
		app,
	}) => {
		// The counter-case. A gate with no positive half passes just as happily when it
		// hides the feature from everybody. Both flags, because the two capabilities have
		// different thresholds and one of them would otherwise never be asserted present.
		const requests = trackGraphQL(page);
		await app.enableFeatures([
			"VITE_FEATURE_LIBRARY_BRANDING",
			"VITE_FEATURE_LIBRARY_SUPPORT_URL",
		]);
		await app.signIn();
		await app.mockGraphQL({
			...mocks,
			LoadLibrary: branded,
			LoadLibraryBasics: branded,
		});

		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		const loadLibrary = requests.find((body) =>
			body.includes("LoadLibrary("),
		);
		expect(loadLibrary).toBeDefined();

		const selection = stripComments(
			(JSON.parse(loadLibrary!) as { query: string }).query,
		);
		for (const field of FIELDS_8_71_0_LACKS) {
			expect(selection, `did not ask for ${field}`).toContain(field);
		}
	});
});
