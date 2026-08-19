import { expect, test, type Page } from "@playwright/test";

// Window.__APP_ENV__ and __DCB_BUNDLE_BASE_URL__ are declared once, in
// src/application.tsx. A second declaration here narrowed the type and
// collided with it as soon as the specs joined the tsconfig program.

const runtimeConfig = {
	VITE_KEYCLOAK_URL: "https://identity.example.invalid",
	VITE_KEYCLOAK_ID: "dcb-admin-libraries",
	VITE_DCB_API_BASE: "https://api.example.invalid",
	VITE_DCB_SEARCH_BASE: "https://search.example.invalid",
	VITE_MUI_X_LICENSE_KEY: "",
};

const bundlePath = "/dcb-admin-for-libraries/v-test";

async function mapPublishedPrefix(page: Page, prefix: string): Promise<void> {
	await page.route(`http://localhost:4174${prefix}/**`, async (route) => {
		const sourceUrl = new URL(route.request().url());
		sourceUrl.pathname = sourceUrl.pathname.replace(prefix, "");
		const response = await route.fetch({ url: sourceUrl.href });
		await route.fulfill({ response });
	});
}

async function mount(page: Page, path: string): Promise<void> {
	await mapPublishedPrefix(page, bundlePath);

	await page.goto(`${bundlePath}/ki-bootstrap.js`);
	await page.evaluate(
		async ({ path, runtimeConfig }) => {
			window.history.replaceState({}, "", path);
			document.head.innerHTML = "";
			document.body.innerHTML = '<main id="bootloader-mount"></main>';

			const importModule = new Function("url", "return import(url)") as (
				url: string,
			) => Promise<{
				mount(options: {
					element: HTMLElement;
					config: Record<string, unknown>;
				}): Promise<void>;
			}>;
			const adapter = await importModule(
				"/dcb-admin-for-libraries/v-test/ki-bootstrap.js",
			);
			await adapter.mount({
				element: document.getElementById("bootloader-mount")!,
				config: runtimeConfig,
			});
		},
		{ path, runtimeConfig },
	);
	await page.waitForLoadState("networkidle");
}

test("mounts at the host root with runtime configuration", async ({ page }) => {
	await mount(page, "/login");

	await expect(page).toHaveURL(/\/login$/);
	await expect(
		page.getByRole("button", { name: /sign in with keycloak/i }),
	).toBeVisible();
	await expect(page.locator("#bootloader-mount")).not.toBeEmpty();

	const state = await page.evaluate(() => ({
		apiBase: window.__APP_ENV__?.VITE_DCB_API_BASE,
		bundleBase: window.__DCB_BUNDLE_BASE_URL__,
		stylesheets: Array.from(
			document.querySelectorAll<HTMLLinkElement>("link[data-ki-stylesheet]"),
			(link) => link.href,
		),
	}));

	expect(state.apiBase).toBe(runtimeConfig.VITE_DCB_API_BASE);
	expect(state.bundleBase).toBe(
		"http://localhost:4174/dcb-admin-for-libraries/v-test/",
	);
	expect(state.stylesheets).toHaveLength(1);
	expect(state.stylesheets[0]).toMatch(
		/^http:\/\/localhost:4174\/dcb-admin-for-libraries\/v-test\/assets\/.+\.css$/,
	);
});

test("preserves the standalone entrypoint in the same artifact", async ({
	page,
}) => {
	await mapPublishedPrefix(page, "/dcb-admin-for-libraries");
	await page.addInitScript((config) => {
		window.__APP_ENV__ = config;
	}, runtimeConfig);

	await page.goto("/dcb-admin-for-libraries/login");

	await expect(page).toHaveURL(/\/dcb-admin-for-libraries\/login$/);
	await expect(
		page.getByRole("button", { name: /sign in with keycloak/i }),
	).toBeVisible();

	// Every asset on this page is served through the mapPublishedPrefix route, which
	// rewrites the URL, re-fetches and fulfils. Returning while those are still in
	// flight tears the context down mid-fulfil — "Fetch response has been disposed".
	// The button appears long before the chunks finish, so the visibility assertion
	// alone is not a sufficient barrier. dcb-admin-ui's equivalent test has always
	// waited here; this one got away without it only while the bundle was small.
	await page.waitForLoadState("networkidle");
});
