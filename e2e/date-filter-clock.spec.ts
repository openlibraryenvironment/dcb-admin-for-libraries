import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import supplierRequests from "./fixtures-data/supplier-requests.json" with { type: "json" };

/**
 * The grid shows times on the clock the reader chose; the date filters used the
 * device's clock regardless. A reader on UTC typing 09:15 to match a row that
 * said 09:15 filtered on a different instant.
 */
test.use({ timezoneId: "America/Chicago" });

test("a date filter reads and writes on the reader's chosen clock", async ({
	app,
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"root:dcb-admin-libraries-theme",
			JSON.stringify({ state: { clock: "service" }, version: 0 }),
		);
	});
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: supplierRequests,
	});

	await page.goto(
		`/supplierRequests?filters=${encodeURIComponent(
			JSON.stringify([
				{
					id: 1,
					field: "dateCreated",
					operator: "onOrAfter",
					value: "2026-09-01T09:15:00.000Z",
				},
			]),
		)}`,
	);
	await expect(page.getByRole("grid")).toBeVisible();
	await page.getByRole("button", { name: /Show filters, 1 applied/ }).click();

	// 09:15 UTC is 04:15 in Chicago, which is what the device clock showed.
	const value = page.locator(".MuiDataGrid-panel input[value]").last();
	await expect(value).toHaveValue(/09:15/);
});
