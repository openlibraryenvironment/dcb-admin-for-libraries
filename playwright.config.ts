import { defineConfig, devices } from "@playwright/test";

/*
 * PREVIEW PORT ALLOCATION — a workspace convention, not a per-repo preference.
 *
 * Three front-end repos sit side by side in this workspace and every one of them used to
 * bind 4173 and 4174, vite's default preview port and the next one up. Playwright's
 * `reuseExistingServer` (on whenever CI is not set) then does exactly what it says: if
 * something is already listening, it does not start a server, it USES that one. So a
 * preview left running by one repo silently serves another repo's test run — observed,
 * more than once, including a suite that ran happily against a different application and
 * redirected to that application's identity provider.
 *
 * So every gate gets a port of its own, and the number says which:
 *
 *     4 1 <gate> <repo>
 *
 *   repo digit   3 dcb-admin-ui    4 dcb-admin-for-libraries    5 symposia-ui
 *   gate band    417x e2e    418x bootloader    419x Lighthouse    420x base-path
 *
 *   |              | e2e  | bootloader | Lighthouse | base-path |
 *   |--------------|------|------------|------------|-----------|
 *   | dcb-admin-ui | 4173 | 4183       | 4193       | -         |
 *   | …-libraries  | 4174 | 4184       | -          | 4204      |
 *   | symposia-ui  | 4175 | 4185       | 4195       | -         |
 *
 * This repo has FOUR gates' worth of the scheme available and uses three, which is why
 * one port per repo was not enough on its own: its gates would have collided with each
 * other rather than with a neighbour, which is the harder failure to spot.
 *
 * `--strictPort` everywhere, deliberately: without it vite silently increments to the
 * next free port and lands on a neighbour's, which is the failure this exists to remove.
 */
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
