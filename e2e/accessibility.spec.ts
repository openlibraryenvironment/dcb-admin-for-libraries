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
 * Step down the page until `locator` exists, so everything deferred behind an
 * IntersectionObserver has mounted before axe scans.
 *
 * Driven by the thing it is trying to reveal rather than by a step count. A fixed
 * number of steps is open-loop, and this reveal runs the instant `page.goto`
 * resolves: under parallel load the document at that moment is shorter than the
 * viewport, so every step is spent against a page with nothing to scroll, the
 * panels render below the fold afterwards, and no observer ever fires. The gate
 * then scanned the KPI header and the trend chart alone - eleven headings out of
 * twenty-five - and reported no violations over the fifteen panels it exists to
 * cover. Observed at ten concurrent workers; CI (workers: 1) rendered fast enough
 * to hide it.
 *
 * Polling fixes that because a pass costs nothing while the page is still empty
 * and starts doing work the moment there is any. One viewport per pass, not a
 * jump to the bottom: an observer whose sentinel never crosses the viewport never
 * fires, and the poll interval is what gives each newly mounted panel a frame to
 * paint and a fetch to land before the next step.
 */
/**
 * The last panel on the insights page, and the only one whose presence proves the
 * deferred half actually mounted. RareGemPanel is unconditional, so unlike a
 * panel that hides itself when empty this cannot be satisfied vacuously, and its
 * title renders outside its own loading branch so it appears on mount rather than
 * on fetch.
 */
const RARE_GEM = "Unique collection value";

async function scrollUntilPresent(
	page: import("@playwright/test").Page,
	locator: import("@playwright/test").Locator,
) {
	await expect
		.poll(
			async () => {
				await page.evaluate(() =>
					window.scrollBy(0, Math.max(window.innerHeight - 100, 200)),
				);
				return locator.count();
			},
			{
				message:
					"scrolled to the bottom without the last deferred panel ever mounting",
				timeout: 30_000,
			},
		)
		.toBeGreaterThan(0);
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
		reveal: (page) =>
			scrollUntilPresent(page, page.getByRole("heading", { name: RARE_GEM })),
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
				page.getByRole("heading", { name: RARE_GEM }),
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
