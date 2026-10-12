import { test, expect } from "./fixtures/test";

// The unauthenticated entry point. It renders with no network at all, which
// makes it the one page that proves the harness itself works: if runtime config
// injection or the build were wrong, nothing here would render.
test.describe("Login", () => {
	test("offers sign-in without a session", async ({ page }) => {
		await page.goto("/login");

		await expect(
			page.getByRole("heading", { name: "Log in to DCB Admin for Libraries" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /sign in with keycloak/i }),
		).toBeVisible();
	});

	test("does not render a protected page without a session", async ({
		page,
	}) => {
		// The __authenticated layout starts sign-in for the whole tree, so a deep
		// link without a session must go to the identity provider instead of
		// rendering the page first and redirecting after. react-oidc-context's first
		// step is the discovery document, which is enough to prove the redirect was
		// started - the fake authority does not resolve, so nothing beyond it can
		// happen, and that is the point: no protected content is on screen.
		const identityProviderCall = page.waitForRequest((request) =>
			request.url().startsWith("https://e2e-fake-keycloak.invalid/"),
		);

		await page.goto("/mappings");

		expect((await identityProviderCall).url()).toContain(
			"/.well-known/openid-configuration",
		);
		await expect(page.getByRole("grid")).toHaveCount(0);
	});

	test("stops and explains when the identity provider is down", async ({
		page,
	}) => {
		let discoveryCalls = 0;
		await page.route("**/.well-known/openid-configuration", (route) => {
			discoveryCalls += 1;
			return route.fulfill({ status: 503, body: "" });
		});

		await page.goto("/mappings");

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("alert")).toContainText(
			/authentication error/i,
		);
		// The library guard re-called signinRedirect after every failure, so this
		// counted up for as long as the tab stayed open.
		expect(discoveryCalls).toBe(1);
	});

	test("shows the identity provider's refusal instead of a blank page", async ({
		page,
	}) => {
		await page.goto("/?error=access_denied&state=e2e-unknown-state");

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("alert")).toContainText(
			/authentication error/i,
		);
		await expect(
			page.getByRole("button", { name: /sign in with keycloak/i }),
		).toBeVisible();
	});
});
