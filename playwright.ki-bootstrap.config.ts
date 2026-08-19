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
		env: {
			// Pinned, not inherited. `vite preview` reads `base` from vite.config,
			// which reads VITE_PUBLIC_URL - so the repo's local .env moved preview
			// to /dcb-admin-for-libraries-dev/ while the health check and every
			// spec addressed the root, and the whole suite timed out on a
			// developer's machine while passing in CI (which has no .env).
			//
			// The bootloader case genuinely IS served from the root: the host page
			// owns the origin, ki-bootstrap.js resolves its own assets relative to
			// itself, and mount() calls configureAppBase("/"). The --base on the
			// build above is what makes that worth testing - the assets are stamped
			// for a prefix the host page is not at.
			VITE_PUBLIC_URL: "/",
		},
		timeout: 120_000,
	},
});
