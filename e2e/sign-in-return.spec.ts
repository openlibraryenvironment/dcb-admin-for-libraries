import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { ACCESS_TOKEN, AGENCY_CODE, LIBRARY_ADMIN_ROLES } from "./fixtures/auth";
import { KEYCLOAK_URL } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/** A bookmarked view, opened signed out, is where sign-in comes back to: docs/routing.md. */

const OIDC = `${KEYCLOAK_URL}/protocol/openid-connect`;

const base64url = (value: object) =>
	Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Keycloak as far as a code-flow sign-in needs it. oidc-client-ts 3.5 reads the ID token's
 * claims but does not check its signature, so an unsigned one completes the flow.
 */
async function fakeIdentityProvider(page: Page) {
	const claims = { sub: "e2e-test-user", code: AGENCY_CODE, roles: LIBRARY_ADMIN_ROLES };
	let signIns = 0;

	await page.route("**/.well-known/openid-configuration", (route) =>
		route.fulfill({
			json: {
				issuer: KEYCLOAK_URL,
				authorization_endpoint: `${OIDC}/auth`,
				token_endpoint: `${OIDC}/token`,
				userinfo_endpoint: `${OIDC}/userinfo`,
				end_session_endpoint: `${OIDC}/logout`,
				jwks_uri: `${OIDC}/certs`,
			},
		}),
	);
	await page.route(`${OIDC}/auth?*`, (route) => {
		signIns += 1;
		const asked = new URL(route.request().url()).searchParams;
		const back = new URL(asked.get("redirect_uri")!);
		back.searchParams.set("code", "e2e-code");
		back.searchParams.set("state", asked.get("state")!);
		return route.fulfill({ status: 302, headers: { location: back.href } });
	});
	await page.route(`${OIDC}/token`, (route) =>
		route.fulfill({
			json: {
				id_token: `${base64url({ alg: "none" })}.${base64url(claims)}.`,
				access_token: ACCESS_TOKEN,
				token_type: "Bearer",
				expires_in: 3600,
				scope: "openid profile email",
			},
		}),
	);
	await page.route(`${OIDC}/userinfo`, (route) => route.fulfill({ json: claims }));
	// The release's highlights would otherwise open over the page signed in to
	await page.addInitScript(() => {
		for (const namespace of ["root", "dcb-admin-for-libraries"]) {
			localStorage.setItem(`${namespace}:releaseHighlightsSeen`, String(Number.MAX_SAFE_INTEGER));
		}
	});

	return { signIns: () => signIns };
}

interface Sent {
	query: string;
	pageno: number;
	order: string;
	orderBy: string;
}

test("a bookmarked grid view opens exactly as bookmarked once signed in", async ({
	app,
	page,
}) => {
	const idp = await fakeIdentityProvider(page);
	const sent: Sent[] = [];
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: (variables) => {
			sent.push(variables as unknown as Sent);
			return { patronRequests: { ...patronRequests.patronRequests, totalSize: 60 } };
		},
	});
	const bookmark = "/patronRequests?filters=status:COMPLETED&sort=status:asc&page=2&hide=status";

	await page.goto(bookmark);

	await expect(page.getByRole("grid")).toBeVisible();
	expect(idp.signIns()).toBe(1);
	const url = new URL(page.url());
	expect(decodeURIComponent(url.pathname + url.search)).toBe(bookmark);
	await expect(page.getByRole("columnheader", { name: "Status" })).toHaveCount(0);
	await expect(page.getByRole("toolbar").getByRole("button", { name: "Show filters, 1 applied" })).toBeVisible();
	// Page 2 of the bookmarked filter and sort, and never a first page of the defaults
	expect(sent.length).toBeGreaterThan(0);
	for (const request of sent) {
		expect(request.query).toContain("COMPLETED");
		expect(request).toMatchObject({ pageno: 1, order: "status", orderBy: "ASC" });
	}
});

test("a bookmarked Insights tab and window open as bookmarked once signed in", async ({
	app,
	page,
}) => {
	const idp = await fakeIdentityProvider(page);
	await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
	await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
	await app.mockStats();
	const bookmark = "/insights?tab=gaps&range=30d";

	await page.goto(bookmark);

	await expect(page.getByRole("region", { name: "Collection gaps and supply value" })).toBeVisible();
	await expect(page.getByRole("button", { name: "30 days", pressed: true })).toBeVisible();
	expect(idp.signIns()).toBe(1);
	const url = new URL(page.url());
	expect(url.pathname + url.search).toBe(bookmark);
});
