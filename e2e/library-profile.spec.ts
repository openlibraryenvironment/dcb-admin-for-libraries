import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * The library profile is the biggest form in the application and the surface the
 * Missouri State Library reported against. These specs pin the two things that
 * report turned up which no automated rule catches.
 */

const signedInOnProfile = async (
	app: import("./fixtures/test").AppFixture,
	page: import("@playwright/test").Page,
) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
		LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
	});
	await page.goto("/");
	await expect(page.getByText("E2E Test Library").first()).toBeVisible();
};

/**
 * Fields whose edit control carries its own visible label. Each must contribute
 * exactly ONE visible name in edit mode - the control's - rather than a heading
 * and a floating label saying the same thing seven pixels apart.
 *
 * library.brand.logo_url is absent on purpose: BrandImageField's visible
 * affordance is a button, so its heading is the only name a sighted user gets
 * and it keeps that heading in both modes.
 */
const LABELLED_FIELDS = [
	"Full name",
	"Short name",
	"Abbreviated name",
	"Backup / downtime schedule",
	"Latitude",
	"Longitude",
];

test.describe("library profile", () => {
	test("names each editable field once while editing", async ({ app, page }) => {
		await signedInOnProfile(app, page);
		await page.getByRole("button", { name: /^edit$/i }).click();
		await expect(
			page.getByRole("textbox", { name: /full name/i }).first(),
		).toBeVisible();

		for (const name of LABELLED_FIELDS) {
			// The heading and the floating label are both rendered text nodes, so
			// counting visible exact-text matches is what distinguishes one name
			// from two. The notched-outline legend is aria-hidden and not counted.
			const visible = await page.evaluate((text) => {
				const nodes = Array.from(
					document.querySelectorAll("span, label, p"),
				) as HTMLElement[];
				return nodes.filter((node) => {
					if (node.textContent?.trim() !== text) return false;
					if (node.closest("legend")) return false;
					const style = getComputedStyle(node);
					return style.visibility !== "hidden" && style.opacity !== "0";
				}).length;
			}, name);

			expect(visible, `"${name}" should be named once in edit mode`).toBe(1);
		}
	});

	test("keeps the field headings when not editing", async ({ app, page }) => {
		await signedInOnProfile(app, page);

		for (const name of LABELLED_FIELDS) {
			await expect(
				page.getByText(name, { exact: true }).first(),
				`"${name}" should still be labelled in read mode`,
			).toBeVisible();
		}
	});
});
