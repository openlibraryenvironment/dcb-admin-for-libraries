import { test, expect } from "./fixtures/test";
import { ACCESS_TOKEN } from "./fixtures/auth";
import { API_BASE, KEYCLOAK_URL } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * Silent renewal replaces the access token every few minutes. It must not change
 * what is cached, so it must not cause a single data request: docs/auth.md.
 */

const RENEWED = "e2e-renewed-access-token";

interface DataRequest {
	operationName?: string;
	pageno?: number;
	authorization?: string;
}

test("a silent renewal refetches nothing, and the next request carries the new token", async ({
	app,
	page,
}) => {
	// 62s: oidc-client-ts starts renewing 60s before expiry, so two seconds after load.
	await app.signIn({ expiresInSeconds: 62, refreshToken: "e2e-refresh-token" });
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: {
			patronRequests: { ...patronRequests.patronRequests, totalSize: 60 },
		},
	});

	await page.route("**/.well-known/openid-configuration", (route) =>
		route.fulfill({
			json: {
				issuer: KEYCLOAK_URL,
				authorization_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/auth`,
				token_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/token`,
				userinfo_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/userinfo`,
				end_session_endpoint: `${KEYCLOAK_URL}/protocol/openid-connect/logout`,
				jwks_uri: `${KEYCLOAK_URL}/protocol/openid-connect/certs`,
			},
		}),
	);
	// Held until the page has settled, so the count below starts from a quiet page.
	let releaseToken!: () => void;
	const tokenHeld = new Promise<void>((resolve) => {
		releaseToken = resolve;
	});
	await page.route("**/protocol/openid-connect/token", async (route) => {
		await tokenHeld;
		await route.fulfill({
			json: {
				access_token: RENEWED,
				token_type: "Bearer",
				expires_in: 300,
				refresh_token: "e2e-refresh-token-2",
				scope: "openid profile email",
			},
		});
	});
	await page.route("**/protocol/openid-connect/userinfo", (route) =>
		route.fulfill({ json: { sub: "e2e-test-user" } }),
	);

	const sent: DataRequest[] = [];
	page.on("request", (request) => {
		if (!request.url().startsWith(API_BASE)) return;
		const body = request.method() === "POST" ? request.postDataJSON() : null;
		sent.push({
			operationName: body?.operationName,
			pageno: body?.variables?.pageno,
			authorization: request.headers()["authorization"],
		});
	});
	const renewalStarted = page.waitForRequest("**/protocol/openid-connect/token");

	await page.goto("/patronRequests");
	await expect(
		page.getByRole("grid", { name: /patron requests/i }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: /2026-09-01/ }).first()).toBeVisible();
	await renewalStarted;

	const beforeRenewal = sent.length;
	expect(sent.every((request) => request.authorization === `Bearer ${ACCESS_TOKEN}`)).toBe(
		true,
	);

	releaseToken();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					Object.entries(sessionStorage).find(([key]) =>
						key.startsWith("oidc.user:"),
					)?.[1] ?? "",
			),
		)
		.toContain(RENEWED);
	// Two frames: React has rendered whatever the renewal changed before the grid is touched.
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);

	const nextPage = page.waitForRequest(
		(request) =>
			request.url() === `${API_BASE}/graphql` &&
			request.postDataJSON()?.operationName === "LoadPatronRequests" &&
			request.postDataJSON()?.variables?.pageno === 1,
	);
	await page.getByRole("button", { name: /next page/i }).first().click();
	const afterRenewal = await nextPage;

	expect(afterRenewal.headers()["authorization"]).toBe(`Bearer ${RENEWED}`);
	expect(sent.slice(beforeRenewal)).toEqual([
		{
			operationName: "LoadPatronRequests",
			pageno: 1,
			authorization: `Bearer ${RENEWED}`,
		},
	]);
});
