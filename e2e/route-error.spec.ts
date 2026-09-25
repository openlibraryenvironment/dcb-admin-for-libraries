import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * The route error boundary. The failure used is a route chunk that will not
 * load, which is what a stale client asks for across a deploy - and the only
 * route-level throw this app can produce on demand. docs/testing.md.
 */
test.describe("Route errors", () => {
	test("renders the error component instead of a blank screen", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });

		await page.route("**/assets/settings-*.js", (route) =>
			route.abort("failed"),
		);

		await page.goto("/settings");

		await expect(
			page.getByRole("heading", { level: 1, name: "Something went wrong" }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
	});

	test("does not put the raw error message on screen", async ({
		app,
		page,
	}) => {
		// graphql-request puts the whole response body into error.message, so a
		// boundary that prints it is a route by which a token or a barcode echoed
		// back by a failing service reaches the screen. TanStack's own
		// ErrorComponent prints it; ours deliberately does not.
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });

		await page.route("**/assets/settings-*.js", (route) =>
			route.abort("failed"),
		);

		await page.goto("/settings");

		await expect(
			page.getByRole("heading", { level: 1, name: "Something went wrong" }),
		).toBeVisible();
		await expect(page.getByText(/Failed to fetch dynamically imported/i)).toHaveCount(0);
		await expect(page.getByText(/assets\/settings-/)).toHaveCount(0);
	});
});
