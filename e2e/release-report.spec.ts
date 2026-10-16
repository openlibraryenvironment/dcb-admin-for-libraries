import { test } from "./fixtures/test";
import { render } from "../scripts/release-report";

// A report offered as accessibility evidence is held to the standard it reports on
for (const colorScheme of ["light", "dark"] as const) {
	test(`the release report has no accessibility violations (${colorScheme})`, async ({ app, page }) => {
		await page.emulateMedia({ colorScheme });
		await page.setContent(
			render({
				statuses: { verify_static: "success", verify_e2e: "failed" },
				e2e: [
					{
						file: "accessibility.spec.ts",
						title: "home has no violations",
						tags: ["a11y"],
						covers: "Every check axe can automate passes, in light mode.",
						page: "home",
						view: "light",
						outcome: "passed",
						axe: [{ id: "color-contrast", help: "Contrast", outcome: "passed", criteria: ["1.4.3"] }],
					},
					{
						file: "focus-ring.spec.ts",
						title: "ring",
						tags: ["a11y", "wcag-2.4.7"],
						covers: "A focused icon button shows a focus ring.",
						outcome: "failed",
						axe: [],
					},
				],
				junit: { unit: { tests: 10, passed: 10, failed: 0, skipped: 0 } },
				budget: {
					firstLoad: { size: 240_000, budget: 252_100 },
					routes: [{ name: "Home", size: 120_000, budget: 112_800 }],
					onDemand: [],
				},
				lighthouse: { scores: { performance: 71, accessibility: 100 }, failures: [] },
				vpat: new Map([["3.3.8", "Supports"]]),
				pipeline: { ref: "release", commit: "abc1234", when: new Date("2026-10-16T12:00:00Z") },
			}),
		);
		await app.expectNoAccessibilityViolations();
	});
}
