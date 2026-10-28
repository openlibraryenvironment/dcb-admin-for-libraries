import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };
import { homeCounts } from "./fixtures/home";

/** Pickup requests, behind VITE_FEATURE_PICKUP_REQUESTS: docs/pickup-requests.md. */

const LOCATIONS = {
	agencies: {
		totalSize: 1,
		content: [{ code: "e2e-agency", locations: [{ id: "loc-1" }, { id: "loc-2" }] }],
	},
};

const ON = ["VITE_FEATURE_PICKUP_REQUESTS", "VITE_FEATURE_AGENCY_SCOPED_REQUESTS"];

test.describe("Pickup requests", () => {
	test("is neither a tab nor an address while the service does not offer it", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library, LoadAgencyLocationsForExport: LOCATIONS });

		await page.goto("/pickupRequests");

		await expect(page).toHaveURL((url) => url.pathname === "/");
		await expect(page.getByRole("tab", { name: "Supplier requests" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Pickup requests" })).toHaveCount(0);
	});

	test("lists other libraries' patrons' requests at the library's locations, and offers no clean up", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(ON);
		await app.signIn();
		const queries: string[] = [];
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadAgencyLocationsForExport: LOCATIONS,
			LoadPatronRequests: (variables: Record<string, unknown>) => {
				queries.push(String(variables.query));
				return patronRequests;
			},
		});

		await page.goto("/");
		await page.getByRole("tab", { name: "Pickup requests" }).click();

		await expect(page.getByRole("heading", { level: 1, name: "Pickup requests" })).toBeVisible();
		await expect(page.getByRole("grid", { name: "Pickup requests" })).toBeVisible();
		await expect.poll(() => queries.at(-1)).toBe(
			'pickupLocationCode:("loc-1" OR "loc-2") AND NOT (patronAgencyCode:e2e-agency)',
		);
		// The pickup library reads the request; only the borrower and the supplier act on it
		await expect(page.getByRole("button", { name: /^Actions/ })).toHaveCount(0);
		await expect(page.getByRole("checkbox", { name: /select all/i })).toHaveCount(0);
		await app.expectNoAccessibilityViolations();
	});

	test("says so when the library has no locations, and asks for no requests", async ({ app, page }) => {
		await app.enableFeatures(ON);
		await app.signIn();
		let asked = 0;
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadAgencyLocationsForExport: { agencies: { totalSize: 1, content: [{ code: "e2e-agency", locations: [] }] } },
			LoadPatronRequests: () => {
				asked += 1;
				return patronRequests;
			},
		});

		await page.goto("/pickupRequests");

		await expect(
			page.getByText("Your library has no locations recorded, so nothing can be collected here."),
		).toBeVisible();
		expect(asked).toBe(0);
	});

	test("is where Home's collecting counts lead, filtered to what each counts", async ({ app, page }) => {
		await app.enableFeatures([...ON, "VITE_FEATURE_HOME_PICKUP_HERE"]);
		await app.signIn();
		const queries: string[] = [];
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadAgencyLocationsForExport: LOCATIONS,
			LoadHomePickupHere: homeCounts({ ready: 5, arriving: 0 }),
			LoadPatronRequests: (variables: Record<string, unknown>) => {
				queries.push(String(variables.query));
				return patronRequests;
			},
		});

		await page.goto("/");
		const here = page.getByRole("region", { name: "Collecting at your locations for other libraries" });
		await expect(here.getByText("Pickup requests lists them.", { exact: false })).toBeVisible();
		// A zero would open an empty list, so it is not a link
		await expect(here.getByRole("link")).toHaveCount(1);
		await here.getByRole("link", { name: /requests ready for other libraries' patrons to collect/ }).click();

		await expect(page).toHaveURL(/\/pickupRequests\?filters=status(:|%3A)READY_FOR_PICKUP/);
		await expect.poll(() => queries.at(-1)).toContain("READY_FOR_PICKUP");
		await expect.poll(() => queries.at(-1)).toContain('pickupLocationCode:("loc-1" OR "loc-2")');
	});
});
