import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };

// Reference value mappings: the app's representative server-driven grid. It
// pairs a library lookup (which decides whether editing is permitted) with a
// paginated, server-filtered mapping query, so it exercises the parts of the
// harness every future grid spec will need.

// DENY_LIBRARY_MAPPING_EDIT *enabled* means the library may NOT edit its
// mappings, so the fixture is built from the permission we want, not the flag.
function libraryWithEditing(allowed: boolean) {
	const [content] = library.libraries.content;
	const { libraryGroup } = content.membership[0];
	return {
		libraries: {
			...library.libraries,
			content: [
				{
					...content,
					membership: [
						{
							libraryGroup: {
								...libraryGroup,
								consortium: {
									...libraryGroup.consortium,
									functionalSettings: [
										{
											...libraryGroup.consortium.functionalSettings[0],
											enabled: !allowed,
										},
									],
								},
							},
						},
					],
				},
			],
		},
	};
}

test.describe("Mappings", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
	});

	test("renders the library's mappings", async ({ app, page }) => {
		await app.mockGraphQL({
			LoadLibrary: libraryWithEditing(true),
			LoadMappings: mappings,
		});

		await page.goto("/mappings");

		const grid = page.getByRole("grid");
		await expect(grid).toBeVisible();

		// fromCategory/toCategory are hidden by the grid's visibility model, so rows
		// are identified by the values a user can actually see.
		await expect(grid.getByRole("row", { name: /Adult/ })).toContainText(
			"e2e-lms",
		);
		await expect(grid.getByRole("row", { name: /Main Library/ })).toContainText(
			"main",
		);
	});

	test("offers editing when the consortium permits it", async ({
		app,
		page,
	}) => {
		await app.mockGraphQL({
			LoadLibrary: libraryWithEditing(true),
			LoadMappings: mappings,
		});

		await page.goto("/mappings");
		await expect(page.getByRole("grid")).toBeVisible();

		await expect(
			page.getByRole("menuitem", { name: "Edit" }).first(),
		).toBeEnabled();
	});

	test("withholds editing when DENY_LIBRARY_MAPPING_EDIT is enabled", async ({
		app,
		page,
	}) => {
		await app.mockGraphQL({
			LoadLibrary: libraryWithEditing(false),
			LoadMappings: mappings,
		});

		await page.goto("/mappings");
		await expect(page.getByRole("grid")).toBeVisible();

		// The actions column is not rendered at all when the consortium withholds
		// editing. Hiding a control is not the security boundary - the API is - but
		// a library that may not edit should not be offered the action.
		await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
	});

	test("asks the server for its rows rather than filtering locally", async ({
		app,
		page,
	}) => {
		// Server-side pagination is a scale requirement, not a preference: at 20M
		// records the grid must never be handed the corpus to page client-side.
		// The proof is that the first render already carries pageno/pagesize to
		// the server. Registered after mockGraphQL so this handler runs first
		// (Playwright matches routes newest-first) and falls through to it.
		const queries: Record<string, unknown>[] = [];
		await app.mockGraphQL({
			LoadLibrary: libraryWithEditing(true),
			LoadMappings: mappings,
		});
		await page.route("**/graphql", async (route) => {
			const body = route.request().postDataJSON();
			if (body?.operationName === "LoadMappings") {
				queries.push(body.variables ?? {});
			}
			await route.fallback();
		});

		await page.goto("/mappings");
		await expect(page.getByRole("grid")).toBeVisible();

		await expect
			.poll(() => queries.length, {
				message: "the grid never queried the server for mappings",
			})
			.toBeGreaterThan(0);
		expect(queries[0]).toMatchObject({ pageno: 0 });
		expect(queries[0].pagesize).toBeGreaterThan(0);
	});
});
