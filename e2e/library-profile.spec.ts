import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import { API_BASE } from "./fixtures/runtime-config";

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
	await page.goto("/library");
	await expect(page.getByText("E2E Test Library").first()).toBeVisible();
};

const LIBRARY_ID = library.libraries.content[0].id;

/** Answers UpdateLibrary and keeps every set of variables it was sent. */
const recordUpdates = () => {
	const sent: Record<string, unknown>[] = [];
	const responder = (variables: Record<string, unknown>) => {
		sent.push(variables);
		return { updateLibrary: { id: LIBRARY_ID } };
	};
	return { sent, responder };
};

/** Fills the change-log form the Save confirmation asks for, and confirms. */
const confirmChange = async (
	page: import("@playwright/test").Page,
	reason: string,
) => {
	const dialog = page.getByRole("dialog", { name: "Edit E2E Test Library" });
	await dialog.getByRole("combobox", { name: /Change category/ }).click();
	await page.getByRole("option", { name: "Details changed" }).click();
	await dialog.getByRole("textbox", { name: /Reason for change/ }).fill(reason);
	await dialog.getByRole("button", { name: "Confirm changes" }).click();
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
		const updates = recordUpdates();
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: withoutCoordinates,
			LoadLibraryBasics: withoutCoordinates,
			LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
			LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
			UpdateLibrary: updates.responder,
		});
		await page.goto("/library");
		await page.getByRole("button", { name: /^edit$/i }).click();

		const fullName = page.getByRole("textbox", { name: /full name/i }).first();
		await fullName.fill("Anytown Public Library");

		// The symptom is on SAVE, not on typing: with a resolver, react-hook-form
		// surfaces an error only for the field that changed, so nothing showed until
		// handleSubmit ran the whole schema - and then the form refused to submit
		// over a field the user had never touched, in Yup's own English.
		await page.getByRole("button", { name: /^save$/i }).click();

		await expect(page.getByText(/cannot be null/i)).toHaveCount(0);

		// Without the fix Save does nothing and this dialog never opens. Once it is
		// open the page behind it is aria-hidden, so asserting on the Save button
		// here would pass whether or not anything was saved.
		await confirmChange(page, "Name corrected");

		await expect.poll(() => updates.sent.length).toBe(1);
		expect(updates.sent[0]).toEqual({
			input: {
				id: LIBRARY_ID,
				fullName: "Anytown Public Library",
				reason: "Name corrected",
				changeCategory: "Details changed",
				changeReferenceUrl: "",
			},
		});
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
		await page.goto("/library");
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

const STATS_MOCKS = {
	LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
	LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
};

const renamed = (fullName: string) => ({
	libraries: {
		...library.libraries,
		content: [{ ...library.libraries.content[0], fullName }],
	},
});

test.describe("editing the profile", () => {
	test("keeps an edit in progress when the record is refetched", async ({
		app,
		page,
	}) => {
		await page.clock.install();
		let loads = 0;
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: () => {
				loads += 1;
				return loads === 1 ? library : renamed("Renamed on the server");
			},
			LoadLibraryBasics: library,
			...STATS_MOCKS,
		});

		await page.goto("/library");
		await page.getByRole("button", { name: /^edit$/i }).click();
		const fullName = page.getByRole("textbox", { name: /full name/i }).first();
		await fullName.fill("Typed but not saved");

		// Past the five-minute staleTime, then back to the tab: a focus refetch.
		await page.clock.fastForward("06:00");
		await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));

		await expect(
			page.getByRole("heading", { level: 1, name: /Renamed on the server/ }),
		).toBeVisible();
		await expect(fullName).toHaveValue("Typed but not saved");
	});

	test("a staged logo alone can be saved, and cancelling forgets it", async ({
		app,
		page,
	}) => {
		await app.enableFeatures([
			"VITE_DISCOVERY_ACTIVE",
			"VITE_FEATURE_LIBRARY_BRANDING",
		]);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			...STATS_MOCKS,
		});
		await page.route("**/brand-assets", (route) =>
			route.fulfill({ json: { url: "https://assets.example.invalid/logo.png" } }),
		);

		await page.goto("/library");
		await page.getByRole("button", { name: /^edit$/i }).click();
		const save = page.getByRole("button", { name: /^save$/i });
		await expect(save).toBeDisabled();

		const logo = {
			name: "logo.png",
			mimeType: "image/png",
			buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
		};
		await page.locator('input[type="file"]').setInputFiles(logo);
		await expect(save).toBeEnabled();

		await page.getByRole("button", { name: /^cancel$/i }).click();
		await page.getByRole("button", { name: /^edit$/i }).click();
		await expect(save).toBeDisabled();

		await page.locator('input[type="file"]').setInputFiles(logo);
		await save.click();
		await expect(page.getByRole("dialog")).toBeVisible();
	});

	test("saves an edit with its reason, says so, and returns focus to Edit", async ({
		app,
		page,
	}) => {
		const updates = recordUpdates();
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			...STATS_MOCKS,
			UpdateLibrary: updates.responder,
		});

		await page.goto("/library");
		await page.getByRole("button", { name: /^edit$/i }).click();
		await page
			.getByRole("textbox", { name: /support hours/i })
			.fill("Mon-Sat, 9-6");
		await page.getByRole("button", { name: /^save$/i }).click();
		await confirmChange(page, "Saturday opening");

		await expect.poll(() => updates.sent.length).toBe(1);
		expect(updates.sent[0]).toEqual({
			input: {
				id: LIBRARY_ID,
				supportHours: "Mon-Sat, 9-6",
				reason: "Saturday opening",
				changeCategory: "Details changed",
				changeReferenceUrl: "",
			},
		});

		await expect(page.getByRole("alert")).toContainText(
			"The library E2E Test Library was updated successfully",
		);
		await expect(page.getByRole("button", { name: /^save$/i })).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^edit$/i })).toBeFocused();
	});
});

test.describe("leaving the profile with unsaved edits", () => {
	const settingsTab = (page: import("@playwright/test").Page) =>
		page.getByRole("tab", { name: /^preferences$/i });
	const leaveDialog = (page: import("@playwright/test").Page) =>
		page.getByRole("dialog", { name: "Leave without saving?" });

	const editFullName = async (
		app: import("./fixtures/test").AppFixture,
		page: import("@playwright/test").Page,
	) => {
		await signedInOnProfile(app, page);
		await page.getByRole("button", { name: /^edit$/i }).click();
		const fullName = page.getByRole("textbox", { name: /full name/i }).first();
		await fullName.fill("Typed but not saved");
		return fullName;
	};

	test("asks first, and staying keeps what was typed", async ({ app, page }) => {
		const fullName = await editFullName(app, page);

		await settingsTab(page).click();

		const dialog = leaveDialog(page);
		await expect(dialog).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(
					() => !!document.activeElement?.closest('[role="dialog"]'),
				),
			)
			.toBe(true);

		await dialog.getByRole("button", { name: "Keep editing" }).click();

		await expect(dialog).toHaveCount(0);
		await expect(page).toHaveURL(/\/library$/);
		await expect(fullName).toHaveValue("Typed but not saved");
		await expect(settingsTab(page)).toBeFocused();
	});

	test("leaving goes where it was asked to", async ({ app, page }) => {
		await editFullName(app, page);

		await settingsTab(page).click();
		await leaveDialog(page)
			.getByRole("button", { name: "Leave without saving" })
			.click();

		await expect(page).toHaveURL(/\/preferences$/);
		await expect(leaveDialog(page)).toHaveCount(0);
	});

	test("the browser's back button asks too", async ({ app, page }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			...STATS_MOCKS,
		});
		await page.goto("/preferences");
		await page.getByRole("tab", { name: /^your library$/i }).click();
		await page.getByRole("button", { name: /^edit$/i }).click();
		await page
			.getByRole("textbox", { name: /full name/i })
			.first()
			.fill("Typed but not saved");

		await page.goBack();

		await expect(leaveDialog(page)).toBeVisible();
		await leaveDialog(page)
			.getByRole("button", { name: "Leave without saving" })
			.click();
		await expect(page).toHaveURL(/\/preferences$/);
	});

	test("closing the tab asks the browser to confirm", async ({ app, page }) => {
		await editFullName(app, page);

		const prompt = page.waitForEvent("dialog");
		await page.close({ runBeforeUnload: true });
		const dialog = await prompt;

		expect(dialog.type()).toBe("beforeunload");
		await dialog.accept();
	});

	test("with nothing changed, navigating away asks nothing", async ({
		app,
		page,
	}) => {
		await signedInOnProfile(app, page);
		await page.getByRole("button", { name: /^edit$/i }).click();

		await settingsTab(page).click();

		await expect(page).toHaveURL(/\/preferences$/);
		await expect(page.getByRole("dialog")).toHaveCount(0);
	});
});

test.describe("when the profile cannot be loaded", () => {
	test("says so instead of rendering an empty profile", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibraryBasics: library, ...STATS_MOCKS });
		await page.route(`${API_BASE}/graphql`, (route) =>
			route.request().postDataJSON()?.operationName === "LoadLibrary"
				? route.fulfill({
						json: { data: null, errors: [{ message: "unavailable" }] },
					})
				: route.fallback(),
		);

		await page.goto("/library");

		await expect(page.getByRole("alert")).toContainText(/could not be loaded/i);
	});
});

test.describe("statistics", () => {
	test("names its spinners while they load", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library, LoadLibraryBasics: library });
		let release!: () => void;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(`${API_BASE}/graphql`, async (route) => {
			const name = route.request().postDataJSON()?.operationName;
			if (name !== "LoadPatronRequestStats" && name !== "LoadSupplierRequests") {
				return route.fallback();
			}
			await held;
			return route.fulfill({
				json: { data: { patronRequests: { totalSize: 1 } } },
			});
		});

		await page.goto("/library");

		await expect(
			page.getByRole("progressbar", { name: "Loading" }),
		).toHaveCount(2);
		release();
	});
});

test("choosing another library while editing does not carry the edit over", async ({
	app,
	page,
}) => {
	const updates = recordUpdates();
	await app.signIn({ agencyCode: "e2e-agency,e2e-agency-2" });
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequestStats: { patronRequests: { totalSize: 42 } },
		LoadSupplierRequests: { patronRequests: { totalSize: 42 } },
		UpdateLibrary: updates.responder,
	});
	await page.goto("/library");
	await page.getByRole("button", { name: /^edit$/i }).click();
	await page.getByRole("textbox", { name: /full name/i }).first().fill("Edited elsewhere");

	await page.getByRole("combobox", { name: /library/i }).click();
	await page.getByRole("option").nth(1).click();

	await expect(page.getByRole("button", { name: /^edit$/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /^save$/i })).toHaveCount(0);
	expect(updates.sent).toEqual([]);
});
