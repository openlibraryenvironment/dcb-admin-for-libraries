import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e-ki-bootstrap",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "html",

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
			"npm run build -- --base=/dcb-admin-for-libraries/ && npm run preview -- --port 4174 --strictPort",
		url: "http://localhost:4174/ki-bootstrap.js",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
