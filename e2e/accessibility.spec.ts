import { test, expect, type AppFixture } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import {
	colorSchemeAttribute,
	type ColorScheme,
} from "./fixtures/color-scheme";

/**
 * The accessibility gate. WCAG 2.2 AA is the floor, and this is where it is
 * enforced rather than asserted: zero axe violations on every surface below, in
 * BOTH colour schemes, because a palette that passes in light routinely fails
 * in dark.
 *
 * Automated rules catch roughly a third of WCAG failures. This gate is a floor,
 * not a certificate - keyboard completeness, focus order and announcement still
 * need a human. What it does guarantee is that no change silently reintroduces
 * a contrast, name, role or landmark failure.
 *
 * Adding a page: add it to PAGES. That is the whole cost, and it is meant to be
 * that low, because a gate people route around is worse than no gate.
 */

interface Surface {
	name: string;
	path: string;
	/** Runs before navigation: sign-in, mocks, anything else the page needs. */
	prepare?: (app: AppFixture) => Promise<void>;
	/** Waited for before scanning, so axe never sees a half-rendered page. */
	ready: (page: import("@playwright/test").Page) => Promise<void>;
}

const PAGES: Surface[] = [
	{
		name: "login",
		path: "/login",
		ready: async (page) => {
			await expect(
				page.getByRole("button", { name: /sign in with keycloak/i }),
			).toBeVisible();
		},
	},
	{
		name: "mappings",
		path: "/mappings",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library, LoadMappings: mappings });
		},
		ready: async (page) => {
			await expect(page.getByRole("grid")).toBeVisible();
			await expect(page.getByRole("row", { name: /Adult/ })).toBeVisible();
		},
	},
	{
		name: "settings",
		path: "/settings",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library });
		},
		ready: async (page) => {
			await expect(page.getByRole("radiogroup")).toBeVisible();
		},
	},
];

const SCHEMES: ColorScheme[] = ["light", "dark"];

for (const scheme of SCHEMES) {
	test.describe(`WCAG 2.2 AA - ${scheme} mode`, () => {
		for (const surface of PAGES) {
			test(`${surface.name} has no violations`, async ({ app, page }) => {
				await app.useColorScheme(scheme);
				await surface.prepare?.(app);

				await page.goto(surface.path);
				await surface.ready(page);

				// Guards the gate itself: if the scheme never applied, a "passing"
				// dark run would just be a second light run.
				await expect(page.locator("html")).toHaveAttribute(
					colorSchemeAttribute(scheme),
				);

				await app.expectNoAccessibilityViolations();
			});
		}
	});
}
