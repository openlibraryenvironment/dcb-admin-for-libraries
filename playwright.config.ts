import { defineConfig, devices } from "@playwright/test";

/**
 * App-behaviour e2e. Runs the production build under `vite preview`, with the
 * app's runtime configuration injected per test (see e2e/fixtures/) rather than
 * baked into a second, e2e-only build - so what these specs exercise is the
 * artefact CI publishes.
 *
 * Base-path and bootloader concerns live in playwright.ki-bootstrap.config.ts.
 * This suite deliberately serves the app from "/": VITE_PUBLIC_URL is pinned
 * below so a developer's local .env cannot move the app out from under
 * `baseURL` mid-run.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

	use: {
		baseURL: "http://localhost:4173",
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
			"npm run build && npm run preview -- --port 4173 --strictPort",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI,
		env: {
			// Pinned, not inherited: the repo's local .env sets a dev base prefix,
			// and preview would then serve the app somewhere `baseURL` is not.
			VITE_PUBLIC_URL: "/",
		},
		timeout: 180_000,
	},
});
