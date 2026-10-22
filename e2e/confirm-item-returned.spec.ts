import { test, expect } from "./fixtures/test";
import type { Page } from "@playwright/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import audit from "./fixtures-data/audit.json" with { type: "json" };
import { AGENCY_CODE } from "./fixtures/auth";

const BASE = sparse.patronRequests.content[0];

const parked = (status: string, supplierAgency: string) => ({
	patronRequests: {
		...sparse.patronRequests,
		content: [
			{
				...BASE,
				status,
				suppliers: [
					{ id: "sr-1", isActive: true, localAgency: supplierAgency, hostLmsCode: "SUP" },
				],
			},
		],
	},
});

const open = async (page: Page) => {
	await page.goto(`/patronRequests/${BASE.id}`);
	await expect(
		page.getByRole("heading", { level: 1, name: "Patron request" }),
	).toBeVisible();
};

test.describe("Confirm an item is back", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
	});

	test("the supplying library confirms a parked request's item is back", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_CONFIRM_ITEM_RETURNED"]);
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: parked("AWAITING_RETURN_TO_SUPPLIER", AGENCY_CODE),
			LoadHostLms: { hostLms: { content: [] } },
			// A supplier on the request makes the page look up its agency and identities
			LoadAgencies: { agencies: { totalSize: 0, content: [] } },
			LoadPatronIdentities: { patronIdentities: { totalSize: 0, content: [] } },
			GetAuditsByPatronRequest: audit,
		});
		const posted: string[] = [];
		await page.route("**/patrons/requests/*/transition/confirm-returned", (route) => {
			posted.push(new URL(route.request().url()).pathname);
			return route.fulfill({ status: 200, json: BASE.id });
		});

		await open(page);
		await page.getByRole("button", { name: "Confirm item is back" }).click();

		const dialog = page.getByRole("dialog", {
			name: "Confirm this item is back on your shelf?",
		});
		await expect(dialog).toBeVisible();
		await app.expectNoAccessibilityViolations();
		await dialog.getByRole("button", { name: "Confirm item is back" }).click();

		await expect(
			page.getByText("The item was confirmed back, and the request has been released."),
		).toBeVisible();
		expect(posted).toHaveLength(1);
	});

	test("a library that only borrowed the request cannot confirm the supplier's shelf", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_CONFIRM_ITEM_RETURNED"]);
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: parked("AWAITING_RETURN_TO_SUPPLIER", "another-agency"),
			LoadHostLms: { hostLms: { content: [] } },
			// A supplier on the request makes the page look up its agency and identities
			LoadAgencies: { agencies: { totalSize: 0, content: [] } },
			LoadPatronIdentities: { patronIdentities: { totalSize: 0, content: [] } },
			GetAuditsByPatronRequest: audit,
		});

		await open(page);

		await expect(
			page.getByRole("button", { name: "Confirm item is back" }),
		).toBeDisabled();
		await expect(
			page.getByRole("button", { name: "Confirm item is back" }),
		).toHaveAccessibleDescription(/Only a request your library supplied/);
	});

	test("is absent while the service does not offer it", async ({ app, page }) => {
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: parked("AWAITING_RETURN_TO_SUPPLIER", AGENCY_CODE),
			LoadHostLms: { hostLms: { content: [] } },
			// A supplier on the request makes the page look up its agency and identities
			LoadAgencies: { agencies: { totalSize: 0, content: [] } },
			LoadPatronIdentities: { patronIdentities: { totalSize: 0, content: [] } },
			GetAuditsByPatronRequest: audit,
		});

		await open(page);

		await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Confirm item is back" })).toHaveCount(0);
	});
});
