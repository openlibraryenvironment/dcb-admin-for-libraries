import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

// MUI resolves an unrecognised Typography variant to `span`, so the theme's
// custom heading variants were not headings. The detail pages carried an h1 and
// then nothing beneath it, which leaves a screen-reader user no way to move
// between sections of an 1800-line page. WCAG 1.3.1.

test("patron request sections are headings, not spans", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
		LoadPatronRequest: {
			patronRequests: { content: [patronRequests.patronRequests.content[0]] },
		},
		LoadAuditsByPatronRequest: { audits: { content: [], totalSize: 0 } },
	});

	await page.goto("/patronRequests/11111111-1111-1111-1111-111111111111");

	// The accordion section titles carry variant="accordionSummary". One panel is
	// open at a time, so this asserts the open one is a heading with a name -
	// before the change it was an unnamed span and this found nothing.
	await expect(
		page.getByRole("heading", { level: 2, name: /general/i }),
	).toBeVisible({ timeout: 15000 });
});

test("the loading screen's title is its h1", async ({ page }) => {
	// Reached before sign-in, where the app shows its initialising screen.
	await page.goto("/");
	const heading = page.getByRole("heading", { level: 1 });
	await expect(heading.first()).toBeVisible();
});
