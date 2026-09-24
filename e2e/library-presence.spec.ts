import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * The library's presence links. Two fields with two different
 * thresholds: patronWebsite is unconditional since 5.11.1, supportUrl arrived
 * in V9_0_008 and is flagged. docs/service-compatibility.md.
 */

const STATS = { patronRequests: { totalSize: 42 } };
const mocks = {
	LoadLibrary: library,
	LoadLibraryBasics: library,
	LoadPatronRequestStats: STATS,
	LoadSupplierRequests: STATS,
};

test.describe("the library's presence links", () => {
	test.beforeEach(async ({ app }) => {
		await app.enableFeatures([
			"VITE_DISCOVERY_ACTIVE",
			"VITE_FEATURE_LIBRARY_BRANDING",
			"VITE_FEATURE_LIBRARY_SUPPORT_URL",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);
	});

	test("both links are shown, and they are different destinations", async ({
		page,
	}) => {
		await page.goto("/");

		await expect(
			page.getByText("https://library.example.invalid", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByText("https://library.example.invalid/report-a-problem"),
		).toBeVisible();
	});

	test("both are editable, and carry the stored value", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Edit" }).click();

		await expect(
			page.getByRole("textbox", { name: "Library website" }),
		).toHaveValue("https://library.example.invalid");
		await expect(
			page.getByRole("textbox", { name: "Report a problem URL" }),
		).toHaveValue("https://library.example.invalid/report-a-problem");
	});

	test("refuses at the field what dcb-service refuses on write", async ({
		page,
	}) => {
		// Without this the administrator meets a 400 with no field attached, and the whole
		// argument for validating on the server is undone by not saying which box was
		// wrong.
		await page.goto("/");
		await page.getByRole("button", { name: "Edit" }).click();

		const support = page.getByRole("textbox", { name: "Report a problem URL" });
		await support.fill("javascript:alert(1)");
		await support.blur();

		await expect(
			page.getByText(/full web address starting with https:\/\//),
		).toBeVisible();
	});

});

test.describe("a deployment that cannot store the support link", () => {
	// Its own describe rather than a third call to enableFeatures: the fixture MERGES
	// flags into window.__APP_ENV__, so a later call can turn one on and never off. A
	// test that quietly ran with the flag still set would assert nothing.
	test("the support field is not offered, but the website still is", async ({
		page,
		app,
	}) => {
		// A form offering a field that cannot be saved is worse than one that does not
		// offer it — and the flag also keeps it out of the document, without which
		// nothing on this form saves at all.
		await app.enableFeatures([
			"VITE_DISCOVERY_ACTIVE",
			"VITE_FEATURE_LIBRARY_BRANDING",
		]);
		await app.signIn();
		await app.mockGraphQL(mocks);

		await page.goto("/");

		await expect(
			page.getByText("https://library.example.invalid", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("Report a problem URL")).toHaveCount(0);
	});
});
