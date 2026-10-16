import { test, expect } from "./fixtures/test";
import { covers } from "./fixtures/coverage";
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
	test("wraps at 320px rather than scrolling sideways", covers("On a phone-width screen, the header wraps rather than scrolling sideways.", ["1.4.10"]), async ({ app, page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		// Two agencies, so the library selector renders: it is the widest control.
		await app.signIn({ agencyCode: "e2e-agency,e2e-agency-2" });
		await app.mockGraphQL({ LoadLibrary: library });

		await page.goto("/preferences");
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

		await page.goto("/preferences");
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
		const scopes: string[] = [];
		page.on("request", (request) => {
			if (!request.url().endsWith("/graphql")) return;
			const scope = request.postDataJSON()?.variables?.query;
			if (typeof scope === "string") scopes.push(scope);
		});
		const requests = libraryNameRequests(page);
		await app.signIn({ agencyCode: "" });
		await app.mockGraphQL({ LoadLibrary: library });

		await page.goto("/preferences");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.getByRole("banner")).toContainText(
			"DCB Admin for Libraries",
		);

		expect(requests).toEqual([]);
		expect(scopes.filter((scope) => scope.includes("undefined"))).toEqual([]);
	});
});

test("at 320px, the main tabs show that they scroll", covers("On a phone-width screen, the main tabs show that there are more to scroll to.", ["1.4.10"]), async ({ app, page }) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });

	await page.goto("/preferences");
	const tabs = page.getByRole("navigation", { name: /main navigation/i });
	await expect(tabs.getByRole("tab", { name: "Preferences" })).toBeVisible();

	await expect(tabs.locator(".MuiTabs-scrollButtons").first()).toBeVisible();
});
