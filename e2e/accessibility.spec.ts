import { test, expect as strictExpect, type AppFixture } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import { DEFAULT_HOME_TOTALS, homeCounts } from "./fixtures/home";
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import polarisLibrary from "./fixtures-data/library-polaris.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };
import sparseRequest from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import locations from "./fixtures-data/locations.json" with { type: "json" };
import bibs from "./fixtures-data/bibs.json" with { type: "json" };
import audit from "./fixtures-data/audit.json" with { type: "json" };
import {
	colorSchemeAttribute,
	type ColorScheme,
} from "./fixtures/color-scheme";
import { scrollUntilPresent } from "./fixtures/lazy";
import { AGENCY_CODE } from "./fixtures/auth";
import type { Page } from "@playwright/test";

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
	prepare?: (app: AppFixture, page: Page) => Promise<void>;
	/**
	 * Mount anything the page defers until it is scrolled into view.
	 *
	 * axe scans the DOM, not the route - so a panel behind an IntersectionObserver
	 * is not "not yet scanned", it is absent, and the gate goes green over it. A
	 * page that defers content MUST bring it in here, and `ready` must then wait
	 * for the LAST thing revealed rather than the first thing painted.
	 */
	reveal?: (page: Page) => Promise<void>;
	/** Waited for before scanning, so axe never sees a half-rendered page. */
	ready: (page: Page) => Promise<void>;
}

/**
 * The last panel on the insights page, and unconditional - so unlike a panel
 * that hides itself when empty, its presence cannot be satisfied vacuously.
 * Its title renders outside its own loading branch, so it appears on mount
 * rather than on fetch.
 */
const RARE_GEM = "Unique collection value";

/**
 * Every subject, and the heading that proves its last panel has mounted.
 *
 * Waiting on a NAMED heading rather than a count is what makes the reveal
 * deterministic: the panel either mounted or the test says which one did not.
 */
const INSIGHTS_SUBJECTS = [
	{ subject: "trends", lastPanel: "Requesting activity over time" },
	{ subject: "service", lastPanel: "Supplier responsiveness" },
	{ subject: "demand", lastPanel: "Demand nothing could supply" },
	{ subject: "partners", lastPanel: "Borrowing vs supplying" },
	{ subject: "collection", lastPanel: "Who holds the same works" },
	{ subject: "gaps", lastPanel: RARE_GEM },
] as const;

/** A cluster record with one requestable item at the signed-in library. */
const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";

const mockRecord = async (app: AppFixture, page: Page) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
		LoadLocations: {
			locations: {
				totalSize: 1,
				content: [
					{
						id: "loc-1",
						name: "Main desk",
						code: "MAIN",
						agency: { name: "E2E Test Library", code: AGENCY_CODE },
					},
				],
			},
		},
	});
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({
			json: {
				id: RECORD,
				title: "Middlemarch",
				description: "A study of provincial life",
				contributors: [{ name: "Eliot, George" }],
				sourceTypes: ["Book"],
				subjects: [{ value: "Provincial life" }],
			},
		}),
	);
	await page.route("**/items/availability**", (route) =>
		route.fulfill({
			json: {
				itemList: [
					{
						id: "item-1",
						barcode: "30001",
						status: { code: "AVAILABLE" },
						agency: { code: AGENCY_CODE, description: "E2E Test Library" },
						isRequestable: true,
						isSuppressed: false,
						location: { code: "MAIN", name: "Main" },
					},
				],
				timings: {},
			},
		}),
	);
	await page.route("**/patron/auth/lookup", (route) =>
		route.fulfill({
			json: { status: "VALID", localPatronId: ["p1"], agencyCode: AGENCY_CODE },
		}),
	);
};

const openRequestDialog = async (page: Page) => {
	const place = page.getByRole("button", { name: /^place request$/i });
	await expect(place).toBeEnabled();
	await place.click();
	await page.getByRole("button", { name: /continue/i }).click();
};

const PAGES: Surface[] = [
	{
		// Home, where a library administrator lands. Insights is on and the counts include a
		// zero and an unknown, so the scan sees links, plain tiles and the extra link at once.
		name: "home",
		path: "/",
		prepare: async (app) => {
			await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadHomeCounts: homeCounts({ ...DEFAULT_HOME_TOTALS, unfilled: null }),
			});
		},
		ready: async (page) => {
			await expect(page.getByText(/^Counted from /)).toBeVisible();
		},
	},
	{
		// Home with the optional parts a 9.x deployment can turn on, together: a table, a
		// toggle group, comparisons, notices and the Insights tiles all in one scan.
		name: "home, with its 9.x parts on",
		path: "/",
		prepare: async (app) => {
			await app.enableFeatures([
				"VITE_FEATURE_INSIGHTS",
				"VITE_FEATURE_HOME_INSIGHTS",
				"VITE_FEATURE_ANNOUNCEMENTS",
				"VITE_FEATURE_HOME_ANNOUNCEMENTS",
				"VITE_FEATURE_AGENCY_SCOPED_REQUESTS",
				"VITE_FEATURE_HOME_LIBRARY_SPLIT",
				"VITE_FEATURE_HOME_LAST_WEEK",
				"VITE_FEATURE_HOME_SINCE_LAST_VISIT",
			]);
			await app.signIn({ agencyCode: "e2e-agency,second-agency" });
			await app.mockStats();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadHomeLastWeek: homeCounts(DEFAULT_HOME_TOTALS),
				LoadAnnouncements: {
					announcements: [
						{
							id: "live",
							headline: "Closed on Monday",
							body: "",
							urgent: false,
							dismissible: true,
							startsAt: new Date(Date.now() - 86_400_000).toISOString(),
							expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
						},
					],
				},
			});
		},
		ready: async (page) => {
			await expect(page.getByRole("table", { name: "By library" })).toBeVisible();
			await expect(page.getByText("Requests resolved")).toBeVisible();
			await expect(page.getByText(/^Closed on Monday — until /)).toBeVisible();
		},
	},
	{
		// The two parts that belong to an 8.71.0 deployment, or to a library not yet started.
		name: "home, with its 8.71.0 parts on",
		path: "/",
		prepare: async (app) => {
			await app.enableFeatures([
				"VITE_FEATURE_HOME_PICKUP_HERE",
				"VITE_FEATURE_HOME_SETUP_CHECKLIST",
			]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadHomeHistory: homeCounts({ borrowed: 0, supplied: 0 }),
				LoadAgencyLocationsForExport: {
					agencies: {
						totalSize: 1,
						content: [{ code: "e2e-agency", locations: [{ id: "loc-1" }] }],
					},
				},
				LoadHomePickupHere: homeCounts({ ready: 5, arriving: 2 }),
			});
		},
		ready: async (page) => {
			await expect(page.getByRole("heading", { name: "Getting your library ready" })).toBeVisible();
			await expect(page.getByText("requests ready for other libraries' patrons to collect")).toBeVisible();
		},
	},
	{
		// The library profile: the biggest FORM in the app and the only surface where an
		// administrator types. It was not scanned at all, which meant the presence
		// fields would have gone in unaudited — and a form is where name, label and error
		// association actually fail. Every backend-gated block is switched on, so the
		// scan covers the widest shape the page can render rather than the narrowest.
		name: "library profile",
		path: "/library",
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
		// The announcements compose form. Two text fields, a date input and a switch — a form, which is
		// where accessible names and error association fail, and the only surface in this
		// app that publishes something patrons will read.
		name: "announcements",
		path: "/announcements",
		prepare: async (app) => {
			await app.enableFeatures(["VITE_FEATURE_ANNOUNCEMENTS"]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
				LoadAnnouncements: { announcements: [] },
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Tell your patrons" }),
			).toBeVisible();
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
	...INSIGHTS_SUBJECTS.map(
		({ subject, lastPanel }): Surface => ({
			// Insights is the chart-heavy surface, and charts are where contrast
			// failures hide: series colours, axis ticks and legend swatches are all
			// painted from the palette rather than the theme's text tokens, and a
			// palette that clears AA on the light ground routinely fails on the dark
			// one. Scanned with populated data (see DEFAULT_STATS) so the charts are
			// actually drawn - an empty state would pass this gate without testing
			// anything it exists to test.
			//
			// ONE SCAN PER SUBJECT. A subject that is not open does not render, so a
			// scan of the default view would cover a fifth of the feature and report
			// clean - the same failure this gate exists to prevent, wearing a new shape.
			name: `insights - ${subject}`,
			path: `/insights?tab=${subject}`,
			prepare: async (app) => {
				await app.enableFeatures([
					"VITE_FEATURE_INSIGHTS",
					"VITE_FEATURE_INSIGHTS_WALK_UP",
				]);
				await app.signIn();
				await app.mockGraphQL({
					LoadLibrary: library,
					LoadLibraryBasics: library,
				});
				await app.mockStats();
			},
			// The open subject still wraps its panels in LazyPanel. Without this the
			// scan saw the KPI header and nothing else: every chart, table and heading
			// below the fold was unmounted, so the WCAG gate passed over most of what
			// it exists to cover.
			reveal: (page) =>
				scrollUntilPresent(page, page.getByRole("heading", { name: lastPanel })),
			ready: async (page) => {
				await expect(
					page.getByRole("heading", { level: 1, name: /insights/i }),
				).toBeVisible();
				// The KPI header is fed by the one combined /stats/dashboard call, so a
				// rendered figure means the page got past its loader rather than being
				// caught mid-skeleton. `.first()` because the same fill rate can
				// legitimately appear again further down the open subject.
				await expect(page.getByText("89.4%").first()).toBeVisible();
				// ...and the LAST panel of this subject, which is what proves the scroll
				// mounted the deferred half rather than merely running.
				await expect(
					page.getByRole("heading", { name: lastPanel }),
				).toBeVisible();
			},
		}),
	),
	{
		// The duration trends, which sit behind a flag that is off everywhere today - so
		// the trends scan above does not reach this panel at all. A chart with its own
		// toggle group, which is where focus order and unlabelled controls go wrong.
		name: "insights - duration trends",
		path: "/insights?tab=trends",
		prepare: async (app) => {
			await app.enableFeatures([
				"VITE_FEATURE_INSIGHTS",
				"VITE_FEATURE_INSIGHTS_TRENDS",
			]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
			});
			await app.mockStats();
		},
		reveal: (page) =>
			scrollUntilPresent(
				page,
				page.getByRole("heading", { name: "How durations are moving" }),
			),
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { name: "How durations are moving" }),
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
		// The walk-up dialog opens from the Actions menu, so the requesting scan above
		// never contains it.
		name: "requesting - quick walk-up dialog",
		path: "/requesting?filters=keyword%3Amiddlemarch",
		prepare: async (app) => {
			await app.signIn({ roles: ["CONSORTIUM_ADMIN"] });
			await app.mockGraphQL({ LoadLibrary: library });
			await app.mockSearch();
		},
		reveal: async (page) => {
			await page.getByRole("button", { name: /actions/i }).click();
			await page.getByRole("menuitem", { name: /quick walk-up request/i }).click();
		},
		ready: async (page) => {
			await expect(
				page.getByRole("dialog", { name: /quick walk-up request/i }),
			).toBeVisible();
			await expect(page.getByText(/patron validation/i).first()).toBeVisible();
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
		// Every control in it is a form control, in groups, with an error state.
		name: "export wizard",
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
			await page.getByRole("button", { name: "Export" }).click();
			await page.getByRole("menuitem", { name: "Export…" }).click();
			const dialog = page.getByRole("dialog", { name: "Export requests" });
			await expect(dialog).toBeVisible();
			// The error state, so its contrast and its association are scanned too.
			await dialog.getByRole("button", { name: "Clear all" }).click();
			await expect(dialog.getByRole("alert")).toBeVisible();
		},
	},
	{
		// The library profile IN EDIT MODE, with a validation error on screen.
		// Neither state was ever scanned, and between them they carry every
		// form control and every error message in the application - which is
		// where error.main sat at 3.85:1 unnoticed.
		name: "library profile, editing with an error",
		path: "/library",
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
	{
		// Two Host LMS configurations, so every credential row and both sections render.
		name: "service",
		path: "/service",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibraryServiceConfig: polarisLibrary });
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Service" }),
			).toBeVisible();
			await expect(
				page.getByRole("heading", { level: 2, name: /E2E Second Host LMS/ }),
			).toBeVisible();
		},
	},
	{
		name: "maintenance",
		path: "/maintenance",
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Maintenance in progress" }),
			).toBeVisible();
		},
	},
	{
		name: "network error",
		path: "/networkError",
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Network error detected" }),
			).toBeVisible();
		},
	},
	{
		name: "logged out",
		path: "/logout?loggedOut=true",
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Logged out" }),
			).toBeVisible();
		},
	},
	{
		// The library selector renders only for a multi-agency claim; no other surface has one.
		name: "header with library selector",
		path: "/settings",
		prepare: async (app) => {
			await app.signIn({ agencyCode: "e2e-agency,e2e-agency-2" });
			await app.mockGraphQL({ LoadLibrary: library });
		},
		ready: async (page) => {
			await expect(page.getByRole("combobox", { name: "Library" })).toBeVisible();
		},
	},
	{
		name: "announcements, with notices",
		path: "/announcements",
		prepare: async (app) => {
			await app.enableFeatures(["VITE_FEATURE_ANNOUNCEMENTS"]);
			await app.signIn();
			await app.mockGraphQL({
				LoadLibraryBasics: library,
				LoadAnnouncements: {
					announcements: [
						{
							id: "aaaaaaaa-0000-4000-8000-000000000001",
							scopeType: "LIBRARY",
							scopeId: library.libraries.content[0].id,
							headline: "Requesting paused",
							body: "Requests resume on Monday.",
							urgent: false,
							dismissible: true,
							startsAt: "2020-01-01T00:00:00Z",
							expiresAt: "2020-01-31T23:59:59Z",
						},
					],
				},
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("button", { name: "Take down: Requesting paused" }),
			).toBeVisible();
		},
	},
	{
		name: "record information",
		path: `/requesting/${RECORD}`,
		prepare: mockRecord,
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Middlemarch" }),
			).toBeVisible();
			await expect(page.getByText("Eliot, George")).toBeVisible();
		},
	},
	{
		name: "record items",
		path: `/requesting/${RECORD}/items`,
		prepare: mockRecord,
		ready: async (page) => {
			await expect(page.getByRole("grid", { name: /^items$/i })).toBeVisible();
			await expect(page.getByText("item-1")).toBeVisible();
		},
	},
	{
		name: "record history",
		path: `/requesting/${RECORD}/history`,
		prepare: mockRecord,
		ready: async (page) => {
			const grid = page.getByRole("grid", { name: /request history/i });
			await expect(grid).toBeVisible();
			// Rows, not the grid: an empty row group mid-load is an axe "incomplete".
			await expect(grid.getByRole("link", { name: /2026-09-01/ }).first()).toBeVisible();
		},
	},
	{
		name: "requesting dialog, patron step",
		path: `/requesting/${RECORD}`,
		prepare: mockRecord,
		reveal: openRequestDialog,
		ready: async (page) => {
			await expect(
				page.getByRole("textbox", { name: /patron barcode/i }),
			).toBeVisible();
		},
	},
	{
		name: "staff request, manual item selection",
		path: `/requesting/${RECORD}`,
		prepare: mockRecord,
		reveal: async (page) => {
			await openRequestDialog(page);
			const barcode = page.getByRole("textbox", { name: /patron barcode/i });
			await barcode.fill("12345");
			await barcode.press("Enter");
			await page.getByRole("radio", { name: /manual/i }).check();
		},
		ready: async (page) => {
			await expect(
				page.getByRole("combobox", { name: /item library/i }),
			).toBeVisible();
		},
	},
	{
		name: "requesting, advanced search",
		path: "/requesting?filters=keyword%3Amiddlemarch",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library });
			await app.mockSearch();
		},
		reveal: async (page) => {
			await page.getByRole("button", { name: /show advanced search/i }).click();
			await page.getByRole("button", { name: /add filter/i }).click();
		},
		ready: async (page) => {
			await expect(
				page.getByRole("button", { name: /remove filter/i }).first(),
			).toBeVisible();
			await expect(
				page.getByRole("list", { name: /search results/i }),
			).toBeVisible();
		},
	},
	{
		// No suppliers and no members: the sparse shape a new request has.
		name: "patron request detail",
		path: `/patronRequests/${sparseRequest.patronRequests.content[0].id}`,
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadPatronRequest: sparseRequest,
				// Unmocked, it is aborted, and the app's error handler leaves for /networkError mid-scan.
				LoadHostLms: { hostLms: { content: [] } },
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Patron request" }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Check for updates" }),
			).toBeVisible();
		},
	},
	{
		name: "patron request audit log",
		path: `/patronRequests/${sparseRequest.patronRequests.content[0].id}`,
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadPatronRequest: sparseRequest,
				// Unmocked, it is aborted, and the app's error handler leaves for /networkError mid-scan.
				LoadHostLms: { hostLms: { content: [] } },
				GetAuditsByPatronRequest: audit,
			});
		},
		reveal: async (page) => {
			await page.getByRole("tab", { name: "Audit log" }).click();
		},
		ready: async (page) => {
			const grid = page.getByRole("grid", { name: "Audit log" });
			await expect(grid).toBeVisible();
			await expect(grid.getByRole("link")).toBeVisible();
		},
	},
	{
		name: "audit entry",
		path: `/patronRequests/audits/${audit.audits.content[0].id}`,
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				GetAuditById: audit,
				GetAuditNeighbours: { older: audit.audits, newer: { content: [] } },
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: audit.audits.content[0].id }),
			).toBeVisible();
			await expect(page.getByRole("button", { name: "Older" })).toBeEnabled();
		},
	},
	{
		name: "supplier requests",
		path: "/supplierRequests",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraries: library,
				LoadPatronRequests: supplierRequests,
			});
		},
		ready: async (page) => {
			await expect(
				page.getByRole("grid", { name: /supplier requests/i }),
			).toBeVisible();
			await expect(
				page.getByRole("row", { name: /Alpha and the art of failure/ }),
			).toBeVisible();
		},
	},
	{
		name: "locations",
		path: "/locations",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library, LoadLocations: locations });
		},
		ready: async (page) => {
			await expect(page.getByRole("grid", { name: "Locations" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Main Library" })).toBeVisible();
		},
	},
	{
		name: "location detail",
		path: `/locations/${locations.locations.content[0].id}`,
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library, LoadLocation: locations });
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Main Library" }),
			).toBeVisible();
		},
	},
	{
		name: "bibs",
		path: "/bibs",
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library, LoadBibs: bibs });
		},
		ready: async (page) => {
			await expect(page.getByRole("grid", { name: "Bib records" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Middlemarch" })).toBeVisible();
		},
	},
	{
		name: "bib detail",
		path: `/bibs/${bibs.sourceBibs.content[0].id}`,
		prepare: async (app) => {
			await app.signIn();
			await app.mockGraphQL({ LoadLibrary: library, LoadBibMainDetails: bibs });
		},
		ready: async (page) => {
			await expect(
				page.getByRole("heading", { level: 1, name: "Middlemarch" }),
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
				await surface.prepare?.(app, page);

				await page.goto(surface.path);
				await surface.reveal?.(page);
				await surface.ready(page);

				// Guards the gate itself: if the scheme never applied, a "passing"
				// dark run would just be a second light run.
				await expect(page.locator("html")).toHaveAttribute(
					colorSchemeAttribute(scheme),
				);

				// Contrast is judged at rest: a button fading from disabled to enabled was sampled mid-way.
				await expect
					.poll(() =>
						page.evaluate(
							() =>
								document
									.getAnimations()
									.filter((a) => a instanceof CSSTransition && a.playState === "running")
									.length,
						),
					)
					.toBe(0);

				await app.expectNoAccessibilityViolations();
			});
		}
	});
}

/** The widest elements past the right edge, so a failure names what to fix. */
async function horizontalOverflow(page: Page) {
	return page.evaluate(() => {
		const root = document.documentElement;
		const limit = root.clientWidth;
		const offenders = [...document.body.querySelectorAll<HTMLElement>("*")]
			.filter((el) => el.getBoundingClientRect().right > limit + 1)
			.filter((el) => {
				// Inside its own scroller (a tab strip, a grid) it does not move the page.
				for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
					if (getComputedStyle(up).overflowX !== "visible") return false;
				}
				return true;
			})
			.slice(0, 8)
			.map((el) => {
				const id = el.id ? `#${el.id}` : "";
				const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join("");
				return `${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(el.getBoundingClientRect().right)}`;
			});
		return { overflow: root.scrollWidth - limit, offenders };
	});
}

// WCAG 1.4.10: content reflows at 320 CSS px with no horizontal page scroll. A data grid
// may scroll inside itself; the page around it may not.
test.describe("WCAG 2.2 AA - 1.4.10 reflow at 320 CSS px", () => {
	test.use({ viewport: { width: 320, height: 640 } });

	for (const surface of PAGES) {
		test(`${surface.name} does not scroll horizontally`, async ({ app, page }) => {
			await surface.prepare?.(app, page);
			await page.goto(surface.path);
			await surface.reveal?.(page);
			await surface.ready(page);

			const { overflow, offenders } = await horizontalOverflow(page);
			expect(
				overflow,
				`the page is ${overflow}px wider than the viewport:\n  ${offenders.join("\n  ")}`,
			).toBeLessThanOrEqual(0);
		});
	}
});
