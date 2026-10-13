import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import type { OperationMocks } from "./fixtures/graphql";
import { AGENCY_CODE, READ_ONLY_ROLES } from "./fixtures/auth";
import { API_BASE } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };
import polarisLibrary from "./fixtures-data/library-polaris.json" with { type: "json" };
import mappings from "./fixtures-data/mappings.json" with { type: "json" };
import locations from "./fixtures-data/locations.json" with { type: "json" };
import bibs from "./fixtures-data/bibs.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * A Host LMS clientConfig holds the ILS API keys, secrets and the Polaris staff
 * password. Only /service shows it, so no other page may ask for it.
 */

const LOCATION = locations.locations.content[0];
const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";

/** Every GraphQL document the page sends, by operation name. */
const recordDocuments = (page: Page) => {
	const sent: { operationName: string; query: string }[] = [];
	page.on("request", (request) => {
		if (request.url() !== `${API_BASE}/graphql`) return;
		const body = request.postDataJSON() ?? {};
		sent.push({ operationName: body.operationName, query: body.query ?? "" });
	});
	return sent;
};

const sentFor = (
	sent: { operationName: string; query: string }[],
	operationName: string,
) => sent.filter((document) => document.operationName === operationName);

/** A request with a pickup location and a patron Host LMS, so the whole lookup chain runs. */
const FULL_REQUEST = {
	patronRequests: {
		...sparse.patronRequests,
		content: [
			{ ...sparse.patronRequests.content[0], pickupLocationCode: LOCATION.id },
		],
	},
};

interface Surface {
	name: string;
	path: string;
	mocks: OperationMocks;
	/** Operations that must have been sent before the page is judged. */
	expects: string[];
	open?: (page: Page) => Promise<void>;
}

const openRequestDialog = async (page: Page, walkUp = false) => {
	const place = page.getByRole("button", { name: /^place request$/i });
	await expect(place).toBeEnabled({ timeout: 15_000 });
	await place.click();
	if (walkUp) await page.getByRole("radio", { name: /walk-up/i }).check();
	await page.getByRole("button", { name: /continue/i }).click();
};

const recordMocks: OperationMocks = {
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
};

const SURFACES: Surface[] = [
	{
		name: "library profile",
		path: "/library",
		mocks: {
			LoadLibrary: library,
			LoadPatronRequestStats: { patronRequests: { totalSize: 1 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 1 } },
		},
		expects: ["LoadLibrary"],
	},
	{
		name: "mappings",
		path: "/mappings",
		mocks: { LoadLibrary: library, LoadMappings: mappings },
		expects: ["LoadLibrary", "LoadMappings"],
	},
	{
		name: "locations",
		path: "/locations",
		mocks: { LoadLibrary: library, LoadLocations: locations },
		expects: ["LoadLibrary", "LoadLocations"],
	},
	{
		name: "location detail",
		path: `/locations/${LOCATION.id}`,
		mocks: { LoadLocation: locations },
		expects: ["LoadLocation"],
	},
	{
		name: "bibs",
		path: "/bibs",
		mocks: { LoadLibrary: library, LoadBibs: bibs },
		expects: ["LoadLibrary", "LoadBibs"],
	},
	{
		name: "bib detail",
		path: `/bibs/${bibs.sourceBibs.content[0].id}`,
		mocks: { LoadBibMainDetails: bibs },
		expects: ["LoadBibMainDetails"],
	},
	{
		name: "patron request",
		path: `/patronRequests/${sparse.patronRequests.content[0].id}`,
		mocks: {
			LoadPatronRequest: FULL_REQUEST,
			LoadLocation: locations,
			LoadHostLms: {
				hostLms: { content: [{ id: "hl-1", code: "E2E-HOST", name: "E2E Host LMS" }] },
			},
			LoadAgencies: {
				agencies: { content: [{ id: "ag-1", code: AGENCY_CODE, name: "E2E" }] },
			},
			LoadLibraryBasics: library,
		},
		expects: ["LoadPatronRequest", "LoadLocation", "LoadHostLms", "LoadAgencies"],
	},
	{
		name: "staff request dialog",
		path: `/requesting/${RECORD}`,
		mocks: recordMocks,
		expects: ["LoadLibraries"],
		open: (page) => openRequestDialog(page),
	},
	{
		name: "on-site borrowing dialog",
		path: `/requesting/${RECORD}`,
		mocks: recordMocks,
		expects: ["LoadLibrary", "LoadLibraries"],
		open: (page) => openRequestDialog(page, true),
	},
];

const mockRecordApis = async (page: Page) => {
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({ json: { id: RECORD, title: "Middlemarch" } }),
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
};

test.describe("Host LMS credentials", () => {
	for (const surface of SURFACES) {
		test(`are never asked for by the ${surface.name}`, async ({ app, page }) => {
			await app.signIn();
			await app.mockGraphQL(surface.mocks);
			await mockRecordApis(page);
			const sent = recordDocuments(page);

			await page.goto(surface.path);
			await surface.open?.(page);
			for (const operationName of surface.expects) {
				await expect
					.poll(() => sentFor(sent, operationName).length, {
						message: `${operationName} was never sent`,
						timeout: 15_000,
					})
					.toBeGreaterThan(0);
			}

			expect(
				sent
					.filter((document) => document.query.includes("clientConfig"))
					.map((document) => document.operationName),
			).toEqual([]);
		});
	}

	test("are fetched by the service page alone, and shown there", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibraryServiceConfig: polarisLibrary });
		const sent = recordDocuments(page);

		await page.goto("/service");

		await expect(page.getByLabel("Polaris staff account: Password")).toHaveValue(
			"e2e-staff-pass",
		);
		expect(sentFor(sent, "LoadLibraryServiceConfig")[0]?.query).toContain(
			"clientConfig",
		);
	});

	test("are out of a read-only user's reach", async ({ app, page }) => {
		await app.signIn({ roles: READ_ONLY_ROLES });
		await app.mockGraphQL({ LoadLibraryServiceConfig: polarisLibrary });
		await app.mockSearch();
		const sent = recordDocuments(page);

		await page.goto("/service");

		await expect(page).toHaveURL(/\/requesting$/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		expect(sentFor(sent, "LoadLibraryServiceConfig")).toEqual([]);
	});
});
