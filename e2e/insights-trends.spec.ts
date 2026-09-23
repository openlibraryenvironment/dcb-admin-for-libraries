import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * Is it getting better or worse?
 *
 * The arithmetic is unit tested; what this covers is the wiring and the words - that a
 * direction reaches the reader as a SENTENCE and not only as a colour, and that the
 * duration trends are absent rather than broken on a deployment whose dcb-service does
 * not serve /insights/trend.
 */

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

const STRIP = "Is it getting better or worse?";
const DURATIONS = "How durations are moving";

test.describe("Insights trends", () => {
	test("names the direction in words, not only in colour", async ({
		page,
		app,
	}) => {
		await app.signIn();
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.mockGraphQL(mocks);
		await app.mockStats();

		await page.goto("/insights?tab=trends");

		const strip = page
			.getByRole("heading", { level: 3, name: STRIP })
			.locator("xpath=ancestor::div[contains(@class,'MuiCard-root')][1]");

		await expect(strip).toBeVisible();

		// The fixture climbs from 78% to 89% filled and falls from 9% to 4% errored over
		// twelve closed buckets, so both rates have a direction and the volume does not.
		await expect(strip).toContainText("89.0%");
		await expect(strip).toContainText("4.0%");

		// Colour is never the only signal: the movement is a sentence.
		await expect(strip).toContainText("Up 4.0% on the preceding period");
		await expect(strip).toContainText("Down 2.0% on the preceding period");
		await expect(strip).toContainText("No clear change");
	});

	test("the duration trends are absent, not broken, without the endpoint", async ({
		page,
		app,
	}) => {
		// The flag off is what every deployment looks like today: /insights/trend is on no
		// dcb-service release. A 404 through the panel contract would say "this panel could
		// not be loaded", which is a fault report for a server that is simply older.
		await app.signIn();
		await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
		await app.mockGraphQL(mocks);
		await app.mockStats();

		const calls: string[] = [];
		page.on("request", (request) => {
			if (request.url().includes("/insights/trend")) calls.push(request.url());
		});

		await page.goto("/insights?tab=trends");
		await expect(
			page.getByRole("heading", { level: 3, name: STRIP }),
		).toBeVisible();

		await expect(page.getByRole("heading", { name: DURATIONS })).toHaveCount(0);
		expect(calls).toEqual([]);
	});

	test("plots the three durations when the endpoint is there", async ({
		page,
		app,
	}) => {
		await app.signIn();
		await app.enableFeatures([
			"VITE_FEATURE_INSIGHTS",
			"VITE_FEATURE_INSIGHTS_TRENDS",
		]);
		await app.mockGraphQL(mocks);
		await app.mockStats();

		await page.goto("/insights?tab=trends");

		const panel = page
			.getByRole("heading", { level: 3, name: DURATIONS })
			.locator("xpath=ancestor::div[contains(@class,'MuiCard-root')][1]");

		// Below the fold, behind an IntersectionObserver.
		for (let i = 0; i < 10 && !(await panel.isVisible()); i++) {
			await page.mouse.wheel(0, 1200);
			await expect(page.locator("body")).toBeVisible();
		}

		await expect(panel).toBeVisible();

		// Switching duration asks the endpoint for a different metric from its OWN
		// vocabulary - never a column name and never caller text.
		const asked: string[] = [];
		page.on("request", (request) => {
			const url = new URL(request.url());
			if (url.pathname.endsWith("/insights/trend")) {
				asked.push(url.searchParams.get("metric") ?? "");
			}
		});

		await panel
			.getByRole("button", { name: "Time in transit", exact: true })
			.click();
		await expect.poll(() => asked).toContain("STATUS_DWELL");
	});
});
