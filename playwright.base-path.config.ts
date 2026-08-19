import { defineConfig, devices } from "@playwright/test";

/**
 * The app served from a PATH PREFIX, which is how it actually ships: the CI
 * build runs `VITE_PUBLIC_URL=/dcb-admin-for-libraries/ npm run build` so that
 * one origin can host it next to dcb-admin at /dcb-admin.
 *
 * playwright.config.ts pins VITE_PUBLIC_URL to "/" for every other spec, so
 * until this config existed the shipped configuration was the one configuration
 * no test ran - and a base counted twice (once by Vite, once by the router)
 * looked green all the way to deployment.
 */
const BASE_PATH = "/dcb-admin-for-libraries/";

export default defineConfig({
	testDir: "./e2e-base-path",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

	use: {
		// Deliberately the bare origin, NOT the origin plus BASE_PATH: the specs
		// navigate to full browser paths so that every base segment a URL is
		// expected to carry is written out in the assertion, rather than being
		// supplied invisibly by Playwright's URL resolution.
		baseURL: "http://localhost:4175",
		trace: "on-first-retry",
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	webServer: {
		command:
			"npm run build && npm run preview -- --port 4175 --strictPort",
		url: `http://localhost:4175${BASE_PATH}`,
		reuseExistingServer: !process.env.CI,
		env: {
			// Set for BOTH commands, not just the build: `vite preview` reads the
			// same config, so a base supplied only to the build would be served
			// from somewhere else entirely.
			VITE_PUBLIC_URL: BASE_PATH,
		},
		timeout: 180_000,
	},
});
