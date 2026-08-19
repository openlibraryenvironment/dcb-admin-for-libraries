import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * The not-found surface. TanStack's built-in fallback is `<p>Not Found</p>`:
 * no heading, no landmark, no address and no way out, which is what an
 * unmatched URL rendered before defaultNotFoundComponent was configured.
 */
test.describe("Not Found", () => {
	test("renders a titled page for an unmatched URL", async ({ page }) => {
		await page.goto("/no-such-page");

		await expect(
			page.getByRole("heading", { level: 1, name: "Page not found" }),
		).toBeVisible();
		// The address it failed to match. A bare "Not Found" is what made a
		// doubled base path invisible outside devtools.
		await expect(page.getByText("/no-such-page")).toBeVisible();
	});

	test("offers a route home, and it works", async ({ app, page }) => {
		// Signed in, so home renders rather than bouncing to the identity provider.
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });

		await page.goto("/no-such-page");

		await page
			.getByRole("button", { name: "Go to the home page" })
			.click();

		await expect(page).toHaveURL("/");
		await expect(page.getByRole("tab", { name: "Home" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("does not require a session", async ({ page }) => {
		// A wrong URL must not be an authentication wall: nothing here is
		// tenant-scoped, so a signed-out visitor sees the page rather than being
		// bounced to Keycloak and losing the address that was wrong.
		await page.goto("/no-such-page");

		await expect(
			page.getByRole("heading", { level: 1, name: "Page not found" }),
		).toBeVisible();
	});
});
