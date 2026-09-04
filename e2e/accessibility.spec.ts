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
	/**
	 * Mount anything the page defers until it is scrolled into view.
	 *
	 * axe scans the DOM, not the route - so a panel behind an IntersectionObserver
	 * is not "not yet scanned", it is absent, and the gate goes green over it. A
	 * page that defers content MUST bring it in here, and `ready` must then wait
	 * for the LAST thing revealed rather than the first thing painted.
	 */
	reveal?: (page: import("@playwright/test").Page) => Promise<void>;
	/** Waited for before scanning, so axe never sees a half-rendered page. */
	ready: (page: import("@playwright/test").Page) => Promise<void>;
}

/**
 * Scroll to the bottom, in steps, so every IntersectionObserver on the way down
 * fires. One jump to the end can skip observers whose sentinel never intersects
 * the viewport, which is the failure mode this helper exists to avoid.
 */
async function scrollThroughPage(
	page: import("@playwright/test").Page,
	steps = 12,
) {
	for (let i = 0; i < steps; i += 1) {
		await page.mouse.wheel(0, 2000);
	}
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
	{
		// Insights is the chart-heavy surface, and charts are where contrast
		// failures hide: series colours, axis ticks and legend swatches are all
		// painted from the palette rather than the theme's text tokens, and a
		// palette that clears AA on the light ground routinely fails on the dark
		// one. Scanned with populated data (see DEFAULT_STATS) so the charts are
		// actually drawn - an empty state would pass this gate without testing
		// anything it exists to test.
		name: "insights",
		path: "/insights",
		prepare: async (app) => {
			await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
			});
			await app.mockStats();
		},
		// InsightsDashboard wraps nineteen panels in LazyPanel. Without this the scan
		// saw the KPI header and nothing else: every chart, table and heading below
		// the fold was unmounted, so the WCAG gate passed over most of the page it
		// exists to cover. Charts are where a palette actually fails contrast.
		reveal: scrollThroughPage,
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: /insights/i }),
			).toBeVisible();
			// The KPI header is fed by the one combined /stats/dashboard call, so a
			// rendered figure means the page got past its loader rather than being
			// caught mid-skeleton. `.first()` because the same fill rate legitimately
			// appears again in the peer-benchmark table further down - which it could
			// not do before `reveal`, and which is itself a sign the scroll worked.
			await expect(page.getByText("89.4%").first()).toBeVisible();
			// ...and the LAST panel on the page, which is what proves the scroll
			// actually mounted the deferred half rather than merely running. It is
			// unconditional (RareGemPanel, always rendered), so this cannot pass
			// vacuously the way a conditional panel would.
			await expect(
				page.getByRole("heading", { name: "Unique collection value" }),
			).toBeVisible();
		},
	},
	{
		// The surface a mistyped or stale link lands on. It is reached by
		// accident rather than chosen, so it is the last page that should be
		// hard to read - and the giant ErrorOutlined glyph it shares with the
		// maintenance and network-error pages is a contrast risk in both schemes.
		name: "not found",
		path: "/no-such-page",
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Page not found" }),
			).toBeVisible();
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
				await surface.reveal?.(page);
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
