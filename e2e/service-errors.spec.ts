import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { KEYCLOAK_URL } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };

// A failure the page can explain stays on the page; only a page that cannot render at all
// goes to /maintenance or /networkError.

async function reveal(page: Page, heading: string) {
	const target = page.getByRole("heading", { level: 3, name: heading });
	for (let i = 0; i < 14 && !(await target.isVisible()); i++) {
		await page.mouse.wheel(0, 1200);
		await expect(page.locator("body")).toBeVisible();
	}
	await expect(target).toBeVisible();
}

test("a 503 from one Insights panel leaves the reader on Insights", async ({ app, page }) => {
	await app.signIn();
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
	await app.mockStats();
	await page.route("**/insights/failure-taxonomy**", (route) =>
		route.fulfill({ status: 503, json: { message: "busy" } }),
	);

	await page.goto("/insights?tab=service");
	await reveal(page, "Why requests fail");

	await expect(page.getByText("This panel could not be loaded.").first()).toBeVisible({
		timeout: 15_000,
	});
	await expect(page).toHaveURL(/\/insights/);
});

test("a publish that cannot reach the service is reported where it was made", async ({
	app,
	page,
}) => {
	await app.enableFeatures(["VITE_FEATURE_ANNOUNCEMENTS"]);
	await app.signIn();
	// CreateAnnouncement is left unmocked, so it is aborted: "Failed to fetch".
	await app.mockGraphQL({
		LoadLibraryBasics: library,
		LoadAnnouncements: { announcements: [] },
	});

	await page.goto("/announcements");
	await expect(page.getByText("Nothing published.")).toBeVisible();
	await page.getByRole("textbox", { name: /headline/i }).fill("Requesting paused");
	await page
		.getByRole("textbox", { name: /what you want to say/i })
		.fill("Requests resume on Monday.");
	await page.getByRole("button", { name: /^publish$/i }).click();

	await expect(page.getByRole("alert").first()).toBeVisible();
	await expect(page).toHaveURL(/\/announcements$/);
	await expect(page.getByRole("textbox", { name: /headline/i })).toHaveValue(
		"Requesting paused",
	);
});

test("a page that cannot load its data at all still goes to the network page", async ({
	app,
	page,
}) => {
	await app.signIn();
	// LoadMappings unmocked: the page has nothing to render.
	await app.mockGraphQL({ LoadLibrary: library });

	await page.goto("/mappings");

	await expect(page).toHaveURL(/\/networkError$/, { timeout: 15_000 });
});

test("an expired session signs in again and comes back to the same page", async ({
	app,
	page,
}) => {
	await app.signIn({ expiresInSeconds: 5 });
	await app.mockGraphQL({ LoadLibrary: library });
	await page.route("**/.well-known/openid-configuration", (route) =>
		route.fulfill({
			json: {
				issuer: KEYCLOAK_URL,
				authorization_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/auth`,
				token_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/token`,
				end_session_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/logout`,
				jwks_uri: `${KEYCLOAK_URL}/protocol/openid-connect/certs`,
			},
		}),
	);
	let appOrigin = "";
	await page.route("**/protocol/openid-connect/auth**", (route) => {
		// The silent renewal's iframe asks with prompt=none and gets nothing back.
		if (new URL(route.request().url()).searchParams.get("prompt") === "none") {
			return route.fulfill({ contentType: "text/html", body: "" });
		}
		// The full sign-in: send the browser back to the app, where its storage can be read.
		return route.fulfill({ status: 302, headers: { location: `${appOrigin}/no-such-page` } });
	});

	await page.goto("/settings");
	appOrigin = new URL(page.url()).origin;
	await expect(page.getByRole("radiogroup", { name: /colour scheme/i })).toBeVisible();

	await expect(page).toHaveURL(/\/no-such-page$/, { timeout: 30_000 });
	const returnTo = await page.evaluate(
		() =>
			Object.entries(sessionStorage).find(([k]) =>
				k.endsWith("afterLoginRedirectPath"),
			)?.[1],
	);
	expect(returnTo).toBe("/settings");
});
