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

/**
 * dcb-service returns null, not an absent key, for a coordinate a library has
 * never set. That is the state this reproduces: the fixture above omits the
 * fields entirely, which is undefined and was always valid.
 */
test.describe("a library with no coordinates", () => {
	const withoutCoordinates = {
		libraries: {
			...library.libraries,
			content: [
				{ ...library.libraries.content[0], latitude: null, longitude: null },
			],
		},
	};

	test("can still save the rest of its profile", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: withoutCoordinates,
			LoadLibraryBasics: withoutCoordinates,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		});
		await page.goto("/");
		await page.getByRole("button", { name: /^edit$/i }).click();

		const fullName = page.getByRole("textbox", { name: /full name/i }).first();
		await fullName.fill("Anytown Public Library");

		// The symptom is on SAVE, not on typing: with a resolver, react-hook-form
		// surfaces an error only for the field that changed, so nothing showed until
		// handleSubmit ran the whole schema - and then the form refused to submit
		// over a field the user had never touched, in Yup's own English.
		await page.getByRole("button", { name: /^save$/i }).click();

		await expect(page.getByText(/cannot be null/i)).toHaveCount(0);

		// The save went through, so the form left edit mode. Without the fix it
		// stays open with the Latitude field red and Save doing nothing.
		await expect(page.getByRole("button", { name: /^save$/i })).toHaveCount(0);
	});

	test("still rejects a coordinate that is out of range", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: withoutCoordinates,
			LoadLibraryBasics: withoutCoordinates,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		});
		await page.goto("/");
		await page.getByRole("button", { name: /^edit$/i }).click();

		await page.getByRole("textbox", { name: /latitude/i }).first().fill("91");
		await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
	});
});

/**
 * The label and the value were two unrelated runs of text: a screen reader read
 * "Full name" and then "E2E Test Library" with nothing saying they belonged
 * together. WCAG 1.3.1, and invisible to axe.
 */
test.describe("field labels are attached to their values", () => {
	const pairs = (page: import("@playwright/test").Page) =>
		page.evaluate(() =>
			Array.from(document.querySelectorAll("dl")).map((list) => ({
				label: list.querySelector("dt")?.textContent?.trim() ?? "",
				value: list.querySelector("dd")?.textContent?.trim() ?? "",
			})),
		);

	test("each one is a term and its definition", async ({ app, page }) => {
		await signedInOnProfile(app, page);

		expect(await pairs(page)).toContainEqual({
			label: "Full name",
			value: "E2E Test Library",
		});
	});

	test("and the label goes away in edit mode, where the control carries it", async ({
		app,
		page,
	}) => {
		await signedInOnProfile(app, page);
		await page.getByRole("button", { name: /^edit$/i }).click();
		await expect(
			page.getByRole("textbox", { name: /full name/i }).first(),
		).toBeVisible();

		const labels = (await pairs(page)).map((pair) => pair.label);
		expect(labels).not.toContain("Full name");
	});
});
