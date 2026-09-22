import { test, expect as strictExpect, type AppFixture } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import {
	colorSchemeAttribute,
	type ColorScheme,
} from "./fixtures/color-scheme";

/**
 * The accessibility gate: zero axe violations on every surface in PAGES, in
 * both colour schemes. Adding a page means adding it here, and that is meant
 * to be the whole cost. What it does and does not prove: docs/testing.md.
 */

/**
 * Readiness waits are not the thing under test, so they get a longer timeout
 * than the axe assertion: under fullyParallel, MUI X's grid does not always
 * paint inside 5s. docs/testing.md explains what that failure looks like.
 */
const expect = strictExpect.configure({ timeout: 20_000 });

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
 * The last panel on the insights page, and unconditional - so unlike a panel
 * that hides itself when empty, its presence cannot be satisfied vacuously.
 * Its title renders outside its own loading branch, so it appears on mount
 * rather than on fetch.
 */
const RARE_GEM = "Unique collection value";

/**
 * Steps down the page until `locator` exists, so everything behind an
 * IntersectionObserver has mounted before axe scans. POLLED rather than a
 * fixed number of steps, and one viewport per pass: the failure both of those
 * avoid is in docs/testing.md.
 */
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
		// The library profile: the biggest FORM in the app and the only surface where an
		// administrator types. It was not scanned at all, which meant the fields §V-11.1
		// adds would have gone in unaudited — and a form is where name, label and error
		// association actually fail. Every backend-gated block is switched on, so the
		// scan covers the widest shape the page can render rather than the narrowest.
		name: "library profile",
		path: "/",
		prepare: async (app) => {
			await app.enableFeatures([
				"VITE_DISCOVERY_ACTIVE",
				"VITE_FEATURE_LIBRARY_BRANDING",
				"VITE_FEATURE_LIBRARY_SUPPORT_URL",
			]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
				LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
				LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
			});
		},
		ready: async (page) => {
			await expect(page.getByText("E2E Test Library").first()).toBeVisible();
		},
	},
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
			// Four radiogroups now, so this names one. The high-contrast option is
			// the reason this page is scanned at all.
			await expect(
				page.getByRole("radiogroup", { name: /colour scheme/i }),
			).toBeVisible();
			await expect(
				page.getByRole("radio", { name: /high contrast/i }),
			).toBeVisible();
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
		// The requesting page: the ONLY surface a read-only user has, and it was
		// not scanned at all. Every Stepper and every requesting dialog lives
		// behind it.
		name: "requesting",
		path: "/requesting?filters=keyword%3Amiddlemarch",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library });
			await app.mockSearch();
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: /requesting/i }),
			).toBeVisible();
			await expect(
				page.getByRole("list", { name: /search results/i }),
			).toBeVisible();
		},
	},
	{
		// A grid page with rows on it. The mappings scan covers a grid, but this
		// one carries the row links and the detail-panel toggles.
		name: "patron requests",
		path: "/patronRequests",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraries: library,
				LoadPatronRequests: patronRequests,
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("grid", { name: /patron requests/i }),
			).toBeVisible();
			await expect(page.getByRole("link", { name: /2026-09-01/ })).toBeVisible();
		},
	},
	{
		// The library profile IN EDIT MODE, with a validation error on screen.
		// Neither state was ever scanned, and between them they carry every
		// form control and every error message in the application - which is
		// where error.main sat at 3.85:1 unnoticed.
		name: "library profile, editing with an error",
		path: "/",
		prepare: async (app) => {
			await app.enableFeatures([
				"VITE_FEATURE_LIBRARY_BRANDING",
				"VITE_FEATURE_LIBRARY_SUPPORT_URL",
			]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
				LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
				LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
			});
		},
		reveal: async (page) => {
			await expect(page.getByText("E2E Test Library").first()).toBeVisible();
			await page.getByRole("button", { name: /^edit$/i }).click();
			const fullName = page
				.getByRole("textbox", { name: /full name/i })
				.first();
			await expect(fullName).toBeVisible();
			await fullName.fill("");
			await fullName.blur();
		},
		ready: async (page) => {
			await expect(page.getByText(/Enter the Full name/i)).toBeVisible();
		},
	},
	{
		// The statement about this application's accessibility, which would be a
		// poor thing to have an accessibility defect on.
		name: "accessibility statement",
		path: "/accessibility",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library });
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: /accessibility/i }),
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
