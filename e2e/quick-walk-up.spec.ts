import { test, expect, type AppFixture } from "./fixtures/test";
import { AGENCY_CODE, LIBRARY_ADMIN_ROLES, READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };
import type { Page, Route } from "@playwright/test";

const PATRON_BARCODE = "2100042";
const ITEM_BARCODE = "3900001";

/** Drives the dialog to the walk-up POST; `answer` decides what dcb-service says. */
async function placeWalkUp(
	app: AppFixture,
	page: Page,
	answer: (route: Route) => Promise<void>,
	roles: string[] = ["CONSORTIUM_ADMIN"],
	extraMocks: Record<string, unknown> = {},
) {
	await app.signIn({ roles });
	await app.mockGraphQL({
		...extraMocks,
		LoadLibrary: library,
		LoadLibraries: library,
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
	await app.mockSearch();
	await page.route("**/patron/auth/lookup", (route) =>
		route.fulfill({
			json: { status: "VALID", localPatronId: ["p1"], systemCode: "e2e-lms" },
		}),
	);

	const sent: Record<string, unknown>[] = [];
	await page.route("**/patrons/requests/place/walkup", (route) => {
		sent.push(route.request().postDataJSON());
		return answer(route);
	});

	await page.goto("/requesting?filters=keyword%3Amiddlemarch");
	await page.getByRole("button", { name: /^actions$/i }).click();
	await page.getByRole("menuitem", { name: /quick walk-up request/i }).click();
	const dialog = page.getByRole("dialog", { name: /quick walk-up request/i });

	await dialog.getByRole("textbox", { name: /patron barcode/i }).fill(PATRON_BARCODE);
	await dialog.getByRole("button", { name: /validate patron/i }).click();

	await dialog.getByRole("textbox", { name: /item barcode/i }).fill(ITEM_BARCODE);
	await dialog.getByRole("combobox", { name: /pickup location/i }).click();
	await page.getByRole("option", { name: "Main desk" }).click();
	await dialog.getByRole("button", { name: /create request/i }).click();

	await expect.poll(() => sent.length).toBe(1);
	return { dialog, body: sent[0] };
}

test("a walk-up sends the patron's agency as patronAgencyCode, and the patron barcode", async ({
	app,
	page,
}) => {
	const { body } = await placeWalkUp(app, page, (route) =>
		route.fulfill({ status: 400, json: {} }),
	);

	// agencyCode in its place had every walk-up refused, by 8.71.0, 9.0.0 and 9.1.0 alike
	expect(body).toEqual({
		itemHostLmsCode: "e2e-lms",
		itemAgencyCode: AGENCY_CODE,
		itemBarcode: ITEM_BARCODE,
		pickupLocationCode: "loc-1",
		patronBarcode: PATRON_BARCODE,
		patronLocalId: "p1",
		patronAgencyCode: AGENCY_CODE,
		patronHostLmsCode: "e2e-lms",
	});
});

test("a refused walk-up says why, in the desk's terms", async ({ app, page }) => {
	await placeWalkUp(app, page, (route) =>
		route.fulfill({
			status: 400,
			json: {
				failedChecks: [
					{ code: "WALK_UP_ITEM_ALREADY_REQUESTED", description: "In progress" },
				],
			},
		}),
	);

	await expect(
		page.getByText(/already part of a request that is still in progress/i),
	).toBeVisible();
});

test("a walk-up refused for the library's own DCB setup says what to fix", async ({
	app,
	page,
}) => {
	await placeWalkUp(app, page, (route) =>
		route.fulfill({
			status: 400,
			json: {
				failedChecks: [
					{
						code: "SUPPLIER_CANNOT_SUPPLY",
						description:
							"Host LMS e2e-lms refused the credentials. To fix: Correct the credentials for Host LMS e2e-lms in DCB Admin",
					},
				],
			},
		}),
	);

	await expect(page.getByText(/your library cannot lend through dcb/i)).toBeVisible();
	await expect(
		page.getByText(/to fix: correct the credentials for host lms e2e-lms/i),
	).toBeVisible();
});

// dcb-service lets every one of these roles place a walk-up, on 8.71.0 and since
for (const [who, roles] of [
	["a library administrator", LIBRARY_ADMIN_ROLES],
	["a read-only library user", READ_ONLY_ROLES],
] as const) {
	test(`${who} can place a walk-up`, async ({ app, page }) => {
		const { body } = await placeWalkUp(
			app,
			page,
			(route) => route.fulfill({ status: 400, json: {} }),
			[...roles],
		);

		expect(body).toMatchObject({
			itemAgencyCode: AGENCY_CODE,
			patronAgencyCode: AGENCY_CODE,
		});
	});
}

test("the due date shown is this library's copy's, not another with the same barcode", async ({
	app,
	page,
}) => {
	const copy = (agency: string, dueDate: string) => ({
		id: `item-${agency}`,
		barcode: ITEM_BARCODE,
		status: { code: "LOANED" },
		agency: { code: agency, description: agency },
		dueDate,
	});
	// Another library's copy first: matched on barcode alone, its due date was shown
	await page.route("**/items/availability**", (route) =>
		route.fulfill({
			json: {
				itemList: [
					copy("another-agency", "2026-12-25T17:00:00Z"),
					copy(AGENCY_CODE, "2026-11-02T17:00:00Z"),
				],
				timings: {},
			},
		}),
	);

	const { dialog } = await placeWalkUp(
		app,
		page,
		(route) =>
			route.fulfill({
				json: { id: "pr-1", citation: { bibClusterId: "aaaaaaaa-0000-4000-8000-000000000001" } },
			}),
		["CONSORTIUM_ADMIN"],
		{
			LoadPatronRequestsById: {
				patronRequests: { totalSize: 1, content: [{ id: "pr-1", status: "LOANED" }] },
			},
		},
	);

	await expect(dialog.getByText(/successfully checked out/i)).toBeVisible({ timeout: 15_000 });
	await expect(dialog.getByText(/2 November 2026|November 2, 2026|2 Nov 2026|Nov 2, 2026/)).toBeVisible();
	await expect(dialog.getByText(/December/)).toHaveCount(0);
});
