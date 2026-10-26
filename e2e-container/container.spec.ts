import { expect, test } from "@playwright/test";

import { KEYCLOAK_ID } from "../e2e/fixtures/runtime-config";

/** What only the image can be asked: what nginx serves, and that the app it serves starts. */

test("the sign-in page renders from the image", async ({ page }) => {
	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Log in to DCB Admin for Libraries" })).toBeVisible();
});

test("the runtime config is the one the container was started with, and is never cached", async ({ request }) => {
	const response = await request.get("/inject_env.json");
	expect(response.status()).toBe(200);
	expect(response.headers()["cache-control"]).toContain("no-store");
	expect((await response.json()).VITE_KEYCLOAK_ID).toBe(KEYCLOAK_ID);
});

test("index.html is never cached", async ({ request }) => {
	const response = await request.get("/index.html");
	expect(response.status()).toBe(200);
	expect(response.headers()["cache-control"]).toContain("no-store");
});

test("a route the server does not know is handed to the app", async ({ request }) => {
	const response = await request.get("/libraries/some-library/settings");
	expect(response.status()).toBe(200);
	expect(response.headers()["content-type"]).toContain("text/html");
	expect(await response.text()).toContain('<div id="root"');
});

test("the scripts index.html names are served as JavaScript", async ({ request }) => {
	const html = await (await request.get("/index.html")).text();
	const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]);
	expect(scripts.length).toBeGreaterThan(0);
	for (const src of scripts) {
		const response = await request.get(src);
		expect(response.status(), src).toBe(200);
		expect(response.headers()["content-type"], src).toContain("javascript");
	}
});
