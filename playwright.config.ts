import { defineConfig, devices } from "@playwright/test";

/*
 * Runs the production build under `vite preview`, with runtime config injected
 * per test, so these specs exercise the artefact CI publishes. VITE_PUBLIC_URL
 * is pinned below so a local .env cannot move the app out from under baseURL;
 * base-path and bootloader concerns live in playwright.ki-bootstrap.config.ts.
 *
 * Ports are a WORKSPACE allocation, 41<gate><repo>, and this repo is digit 4.
 * Playwright reuses whatever is already listening, so a neighbour’s leftover
 * preview will serve this suite if the numbers collide: docs/testing.md.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Capped rather than left to default to half the cores: see docs/testing.md.
	workers: process.env.CI ? 1 : 4,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

	use: {
		baseURL: "http://localhost:4174",
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
			"npm run build && npm run preview -- --port 4174 --strictPort",
		url: "http://localhost:4174",
		reuseExistingServer: !process.env.CI,
		env: {
			// Pinned, not inherited: the repo's local .env sets a dev base prefix,
			// and preview would then serve the app somewhere `baseURL` is not.
			VITE_PUBLIC_URL: "/",
		},
		timeout: 180_000,
	},
});
