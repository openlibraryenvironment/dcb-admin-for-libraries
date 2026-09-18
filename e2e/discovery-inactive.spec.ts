import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * A deployment with no discovery front end — docs/DEPLOYMENT.md §2b.
 *
 * Both capability flags are ON here, so the only thing hiding the two blocks is the
 * absence of a discovery app rather than a dcb-service too old to store a brand.
 *
 * The flag is a RENDER switch, which every other flag in this app deliberately is not, so
 * the document must be UNCHANGED by it — the second test. Were it to strip fields
 * instead, switching discovery off would stop the brand round-tripping and a stored logo
 * would be lost at the next unrelated save.
 */

const STATS = { patronRequests: { totalSize: 42 } };
const mocks = {
	LoadLibrary: library,
	LoadLibraryBasics: library,
	LoadPatronRequestStats: STATS,
	LoadSupplierRequests: STATS,
};

/** Everything the two blocks are built from. Absent from the page, present in the wire. */
const DISCOVERY_FIELDS = [
	"brandLogoUrl",
	"brandLogoAlt",
	"defaultThemeName",
	"patronWebsite",
	"supportUrl",
];

/**
 * A GraphQL document with its `#` comment lines removed.
 *
 * The document's comments name `patronWebsite` and `supportUrl` themselves, so a
 * "contains the field" assertion over the raw text would pass on the prose alone.
 */
const stripComments = (document: string): string =>
	document
		.split(/\r?\n/)
		.filter((line) => !line.trim().startsWith("#"))
		.join(" ");

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

test.describe("discovery is not deployed", () => {
	test.beforeEach(async ({ app }) => {
		// Both capability flags on, so the only thing hiding the blocks is the absence of
		// a discovery app. Without this the test would pass against a service too old to
		// store a brand and prove nothing about the new flag.
		await app.enableFeatures([
			"VITE_FEATURE_LIBRARY_BRANDING",
			"VITE_FEATURE_LIBRARY_SUPPORT_URL",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
	});

	test("neither discovery block is offered, in view or in edit", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		await expect(
			page.getByRole("heading", {
				name: /how your library appears to patrons/i,
			}),
		).toHaveCount(0);
		await expect(
			page.getByRole("heading", { name: /links for patrons/i }),
		).toHaveCount(0);

		// Edit mode as well: the blocks render different controls there, and a gate that
		// only covered the read-only half would offer three unsaveable boxes on click.
		await page.getByRole("button", { name: "Edit" }).click();

		for (const name of [
			"Logo",
			"Logo description",
			"Discovery theme",
			"Library website",
			"Report a problem URL",
		]) {
			await expect(
				page.getByRole("textbox", { name }),
				`${name} is still offered`,
			).toHaveCount(0);
		}
	});

	test("the document is unchanged, so nothing is lost by hiding the blocks", async ({
		page,
	}) => {
		// The fields exist on this deployment's Library; the flag says only that nobody
		// renders them. Keeping them selected is what lets a stored brand survive — the
		// mutation sends changed fields only, and a field the form never showed cannot
		// have changed.
		const requests = trackGraphQL(page);

		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		const loadLibrary = requests.find((body) => body.includes("LoadLibrary("));
		expect(loadLibrary, "LoadLibrary was never sent").toBeDefined();

		const selection = stripComments(
			(JSON.parse(loadLibrary!) as { query: string }).query,
		);
		for (const field of DISCOVERY_FIELDS) {
			expect(selection, `stopped asking for ${field}`).toContain(field);
		}
	});

	test("has no accessibility violations with both blocks removed", async ({
		page,
		app,
	}) => {
		// Removing two labelled blocks changes heading order and focus order, which is
		// the kind of change a diff does not show and a scan does.
		await page.goto("/");
		await expect(page.getByText("E2E Test Library").first()).toBeVisible();

		await app.expectNoAccessibilityViolations();
	});
});
