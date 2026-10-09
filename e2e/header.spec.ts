import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

const libraryNameRequests = (page: import("@playwright/test").Page) => {
	const bodies: string[] = [];
	page.on("request", (request) => {
		const body = request.postData();
		if (body?.includes("LoadLibraryNames")) bodies.push(body);
	});
	return bodies;
};

test.describe("Header", () => {
	test("wraps at 320px rather than scrolling sideways", async ({ app, page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		// Two agencies, so the library selector renders: it is the widest control.
		await app.signIn({ agencyCode: "e2e-agency,e2e-agency-2" });
		await app.mockGraphQL({ LoadLibrary: library });

		await page.goto("/settings");
		await expect(page.getByRole("combobox", { name: /library/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test("the logo goes home without reloading the application", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		});

		await page.goto("/settings");
		await page.evaluate(() => {
			(window as unknown as { __sameDocument: boolean }).__sameDocument = true;
		});

		await page.getByRole("link", { name: /go to the home page/i }).click();

		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		expect(
			await page.evaluate(
				() => (window as unknown as { __sameDocument?: boolean }).__sameDocument,
			),
		).toBe(true);
	});

	test("asks for no library name when the token names no agency", async ({
		app,
		page,
	}) => {
		const requests = libraryNameRequests(page);
		await app.signIn({ agencyCode: "" });
		await app.mockGraphQL({ LoadLibrary: library });

		await page.goto("/settings");
		await expect(
			page.getByText("DCB Admin for Libraries", { exact: true }),
		).toBeVisible();
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		expect(requests).toEqual([]);
	});
});
