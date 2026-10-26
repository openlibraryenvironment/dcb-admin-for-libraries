import { defineConfig, devices } from "@playwright/test";

import { KEYCLOAK_ID, KEYCLOAK_URL } from "./e2e/fixtures/runtime-config";

/**
 * The gate that drives the image that ships, rather than a preview: docs/testing.md,
 * "The container gate". Port 4214: 41<gate><repo>, the container band, this repo's digit.
 */
const PORT = 4214;
const NAME = "dcb-admin-for-libraries-container-gate";

export default defineConfig({
	testDir: "./e2e-container",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// One container: the tests read what nginx sends, and the image build dominates anyway
	workers: 1,
	reporter: [
		["html", { open: "never", outputFolder: "playwright-report/container" }],
		["junit", { outputFile: "reports/container-junit.xml" }],
		["list"],
	],
	outputDir: "test-results/container",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: [
			// To stderr, which Playwright shows: the build prints its errors on stdout, which it drops
			"docker build -f docker/production/Dockerfile -t dcb-admin-for-libraries:container-gate . 1>&2",
			// `npm run e2e:container` also removes it first: with reuse off, Playwright refuses a held port
			`docker rm -f ${NAME}`,
			[
				`docker run --rm --name ${NAME}`,
				`-p ${PORT}:80`,
				`-e VITE_KEYCLOAK_URL=${KEYCLOAK_URL}`,
				`-e VITE_KEYCLOAK_ID=${KEYCLOAK_ID}`,
				"-e VITE_DCB_API_BASE=https://dcb-api.invalid",
				"-e VITE_DCB_SEARCH_BASE=https://dcb-search.invalid",
				"dcb-admin-for-libraries:container-gate",
			].join(" "),
		].join(" && "),
		url: `http://localhost:${PORT}/index.html`,
		// Never reuse: a container left running serves an image built from older code
		reuseExistingServer: false,
		// npm ci and the build inside Alpine, from a cold layer cache
		timeout: 900_000,
	},
});
