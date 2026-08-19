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
		// withAuthenticationRequired wraps the whole __authenticated tree, so a deep
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
});
