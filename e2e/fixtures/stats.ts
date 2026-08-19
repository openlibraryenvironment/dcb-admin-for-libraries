import type { Page } from "@playwright/test";

/**
 * The insights statistics API.
 *
 * These are REST, not GraphQL: axios calls `${VITE_DCB_API_BASE}/patrons/requests/
 * stats/<name>` with the window and the library's Host LMS code as query params.
 * Dispatch is on the path segment after `stats/`, mirroring mockGraphQL's dispatch
 * on operationName.
 *
 * The defaults are POPULATED rather than empty on purpose. An empty response
 * renders the "no data" placeholder, which would let the accessibility gate pass
 * without ever drawing a chart - and chart series contrast in dark mode is exactly
 * the kind of failure this gate exists to catch.
 *
 * An unmocked endpoint is aborted rather than continued: the API host does not
 * resolve, so continuing means a 30s DNS wait per call.
 */
export type StatsMocks = Record<string, unknown>;

const bucket = (daysAgo: number) =>
	new Date(Date.UTC(2026, 0, 31 - daysAgo)).toISOString();

export const DEFAULT_STATS: StatsMocks = {
	dashboard: {
		fulfillmentCurrent: { successfulCount: 812, failedCount: 96 },
		fulfillmentPrior: { successfulCount: 734, failedCount: 121 },
		turnaroundToLoaned: { p50Seconds: 259200, p95Seconds: 604800 },
		checkoutRate: { reachedCount: 764, totalCount: 908 },
		lendBorrowTotals: { borrowedCount: 908, suppliedCount: 1043 },
		savedByReResolution: 57,
		collectionSummary: { uniqueTitlesRequested: 731, totalRequests: 908 },
	},
	timeseries: [
		{ bucket: bucket(20), series: "LOANED", count: 41 },
		{ bucket: bucket(10), series: "LOANED", count: 63 },
		{ bucket: bucket(0), series: "LOANED", count: 58 },
		{ bucket: bucket(20), series: "ERROR", count: 6 },
		{ bucket: bucket(10), series: "ERROR", count: 4 },
		{ bucket: bucket(0), series: "ERROR", count: 9 },
	],
	"failure-taxonomy": [
		{ reason: "NO_ITEMS_SELECTABLE_AT_ANY_AGENCY", count: 44 },
		{ reason: "PATRON_NOT_FOUND", count: 31 },
		{ reason: "ERROR", count: 21 },
	],
	"supplier-reliability": [
		{ supplierCode: "e2e-lms", fulfilledCount: 412, failedCount: 18 },
		{ supplierCode: "peer-lms", fulfilledCount: 288, failedCount: 47 },
	],
	"net-flow": [
		{ libraryCode: "e2e-lms", borrowedCount: 908, suppliedCount: 1043 },
		{ libraryCode: "peer-lms", borrowedCount: 654, suppliedCount: 501 },
	],
	"time-in-status": [
		{ status: "RESOLVED", medianDwellSeconds: 43200, sampleCount: 611 },
		{ status: "CONFIRMED", medianDwellSeconds: 21600, sampleCount: 588 },
	],
	"supplier-response-sla": [
		{
			supplierCode: "peer-lms",
			medianResponseSeconds: 39600,
			sampleCount: 288,
		},
		{ supplierCode: "e2e-lms", medianResponseSeconds: 12600, sampleCount: 412 },
	],
	"demand-heatmap": [
		{ dayOfWeek: 1, hourOfDay: 9, requestCount: 24 },
		{ dayOfWeek: 3, hourOfDay: 14, requestCount: 41 },
		{ dayOfWeek: 5, hourOfDay: 11, requestCount: 33 },
	],
	"demand-by-format": [
		{ format: "Book", requestCount: 704 },
		{ format: "DVD", requestCount: 121 },
	],
	"demand-by-dimension": [
		{ category: "Book", requestCount: 704 },
		{ category: "DVD", requestCount: 121 },
	],
	"demand-by-pickup-location": [
		{
			pickupLocationCode: "MAIN",
			pickupLocationName: "Main Library",
			requestCount: 512,
		},
		{
			pickupLocationCode: "BRANCH",
			pickupLocationName: "East Branch",
			requestCount: 209,
		},
	],
	"demand-by-patron-group": [
		{ patronGroup: "Undergraduate", requestCount: 488 },
		{ patronGroup: "Faculty", requestCount: 233 },
	],
	"top-requested-titles": {
		content: [
			{ title: "The Ecology of Freedom", requestCount: 31 },
			{ title: "Seeing Like a State", requestCount: 27 },
		],
	},
	"saved-by-re-resolution": 57,
	"unmet-local-demand": [
		{
			clusterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			title: "Debt: The First 5000 Years",
			requestCount: 19,
		},
	],
	"acquisition-opportunities": [
		{
			clusterId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			title: "The Dawn of Everything",
			requestCount: 24,
		},
	],
	"consortial-lifeline": [
		{
			clusterId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			title: "A Pattern Language",
			author: "Christopher Alexander",
			isbn: "9780195019193",
			localBibId: "b1234567",
			supplyCount: 14,
		},
	],
	"unique-contributions": [
		{
			clusterId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
			title: "The Timeless Way of Building",
			author: "Christopher Alexander",
			localBibId: "b7654321",
			supplyCount: 9,
		},
	],
	"peer-benchmarks": [
		{
			libraryCode: "e2e-lms",
			totalRequests: 908,
			checkoutCount: 764,
			successCount: 812,
			failedCount: 96,
		},
		{
			libraryCode: "peer-lms",
			totalRequests: 654,
			checkoutCount: 471,
			successCount: 501,
			failedCount: 153,
		},
	],
	"new-acquisitions-performance": [
		{
			clusterId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
			title: "Weathering",
			author: "Ruth Allen",
			localBibId: "b2468013",
			dateAdded: "2025-11-04T00:00:00Z",
			supplyCount: 6,
		},
	],
};

export async function mockStats(
	page: Page,
	overrides: StatsMocks = {},
): Promise<void> {
	const mocks = { ...DEFAULT_STATS, ...overrides };

	await page.route("**/patrons/requests/stats/**", async (route) => {
		const path = new URL(route.request().url()).pathname;
		const name = path.split("/stats/")[1];
		const body = name === undefined ? undefined : mocks[name];

		if (body === undefined) {
			await route.abort("failed");
			return;
		}

		await route.fulfill({ json: body });
	});
}
