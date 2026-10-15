import type { Page } from "@playwright/test";
import { test, expect, type AppFixture } from "./fixtures/test";
import { AGENCY_CODE } from "./fixtures/auth";
import { contrast } from "./fixtures/contrast";
import library from "./fixtures-data/library.json" with { type: "json" };

const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";
const DUE_DATE = "2026-11-02T17:00:00Z";

const ITEM = {
	id: "item-1",
	barcode: "30001",
	status: { code: "AVAILABLE" },
	agency: { code: AGENCY_CODE, description: "E2E Test Library" },
	isRequestable: true,
	isSuppressed: false,
	localItemType: "BOOK",
	location: { code: "MAIN", name: "Main" },
};

interface Traffic {
	/** Availability calls made after the requesting dialog opened. */
	availability: () => number;
	lookups: Record<string, unknown>[];
	placed: Record<string, unknown>[];
}

const openForm = async (
	app: AppFixture,
	page: Page,
	type: "staff" | "walk-up",
	options: {
		placeStatus?: number;
		checkoutStatus?: string;
		item?: Record<string, unknown>;
		libraries?: typeof library;
	} = {},
): Promise<Traffic> => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: options.libraries ?? library,
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
		LoadPatronRequestsById: {
			patronRequests: {
				totalSize: 1,
				content: [{ id: "pr-1", status: options.checkoutStatus ?? "LOANED" }],
			},
		},
	});
	await page.route("**/opac-inventory/instances/**", (route) =>
		route.fulfill({
			json: { id: RECORD, title: "Middlemarch", contributors: [] },
		}),
	);

	let placed = false;
	let availabilityCalls = 0;
	await page.route("**/items/availability**", (route) => {
		availabilityCalls += 1;
		// The due date exists only once the item has been checked out.
		const offered = { ...ITEM, ...options.item };
		const item = placed ? { ...offered, dueDate: DUE_DATE } : offered;
		return route.fulfill({ json: { itemList: [item], timings: {} } });
	});
	const lookups: Record<string, unknown>[] = [];
	await page.route("**/patron/auth/lookup", (route) => {
		lookups.push(route.request().postDataJSON());
		return route.fulfill({
			json: {
				status: "VALID",
				localPatronId: ["p1"],
				agencyCode: AGENCY_CODE,
				systemCode: "e2e-lms",
			},
		});
	});
	const placedBodies: Record<string, unknown>[] = [];
	await page.route("**/patrons/requests/place**", (route) => {
		placedBodies.push(route.request().postDataJSON());
		if (options.placeStatus) {
			return route.fulfill({ status: options.placeStatus, json: {} });
		}
		placed = true;
		return route.fulfill({
			json: { id: "pr-1", citation: { bibClusterId: RECORD } },
		});
	});

	await page.goto(`/requesting/${RECORD}`);
	const place = page.getByRole("button", { name: /^place request$/i });
	await expect(place).toBeEnabled({ timeout: 15_000 });
	await expect.poll(() => availabilityCalls).toBeGreaterThan(0);
	await place.click();
	if (type === "walk-up") {
		await page.getByRole("radio", { name: /walk-up/i }).check();
	}
	await page.getByRole("button", { name: /continue/i }).click();

	const before = availabilityCalls;
	return { availability: () => availabilityCalls - before, lookups, placed: placedBodies };
};

const barcode = (page: Page) =>
	page.getByRole("textbox", { name: /patron barcode/i });

const choose = async (page: Page, field: RegExp, option: RegExp) => {
	await page.getByRole("combobox", { name: field }).click();
	await page.getByRole("option", { name: option }).click();
};

test("Enter in the barcode field validates the patron", async ({
	app,
	page,
}) => {
	const traffic = await openForm(app, page, "staff");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");

	await expect.poll(() => traffic.lookups.length).toBe(1);
	await expect(page.getByText(/choose a pickup location/i)).toBeVisible();
});

test("focus moves to the next step's first field once the patron is validated", async ({
	app,
	page,
}) => {
	await openForm(app, page, "staff");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");

	await expect(page.getByRole("combobox", { name: /pickup location/i })).toBeFocused();
});

test("validates against the patron's library, never the staff member's", async ({
	app,
	page,
}) => {
	const traffic = await openForm(app, page, "staff");

	await barcode(page).fill("12345");
	await page
		.getByRole("combobox", { name: /affiliated institution/i })
		.click();
	await page.getByRole("button", { name: /clear/i }).click();

	await expect(
		page.getByRole("button", { name: /validate patron/i }),
	).toBeDisabled();
	await barcode(page).press("Enter");
	expect(traffic.lookups).toHaveLength(0);
});

test("announces each step of the form", async ({ app, page }) => {
	await openForm(app, page, "staff");
	const dialog = page.getByRole("dialog");

	await expect(dialog.getByRole("status")).toHaveText(
		/step 1 of 2: patron validation/i,
	);
	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await expect(dialog.getByRole("status")).toHaveText(
		/step 2 of 2: request creation/i,
	);
});

test("a refused staff request says why, even with no failed checks", async ({
	app,
	page,
}) => {
	await openForm(app, page, "staff", { placeStatus: 500 });

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await choose(page, /pickup location/i, /main desk/i);
	await page.getByRole("button", { name: /^submit$/i }).click();

	await expect(page.getByText(/could not be placed/i)).toBeVisible();
});

test("a placed staff request cannot be placed again, and its link stays", async ({
	app,
	page,
}) => {
	await openForm(app, page, "staff");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await choose(page, /pickup location/i, /main desk/i);
	await page.getByRole("button", { name: /^submit$/i }).click();

	const dialog = page.getByRole("dialog");
	await expect(dialog.getByRole("link", { name: /here/i })).toBeVisible();
	await expect(dialog.getByRole("button", { name: /^submit$/i })).toBeDisabled();
});

test("opening the item picker does not ask every library again", async ({
	app,
	page,
}) => {
	const traffic = await openForm(app, page, "staff");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await page.getByRole("radio", { name: /manual/i }).check();
	await choose(page, /item library/i, /e2e test library/i);

	const picker = page.getByRole("combobox", { name: /item local id/i });
	for (let i = 0; i < 3; i += 1) {
		await picker.click();
		await expect(page.getByRole("option", { name: /30001/ })).toBeVisible();
		await picker.press("Escape");
	}

	expect(traffic.availability()).toBeLessThanOrEqual(1);
});

test("choosing another item library clears the item chosen at the first", async ({
	app,
	page,
}) => {
	const [own] = library.libraries.content;
	const other = {
		...own,
		id: "lib-2",
		fullName: "Second Test Library",
		agencyCode: "second-agency",
		agency: { ...own.agency, code: "second-agency" },
	};
	await openForm(app, page, "staff", {
		libraries: { libraries: { ...library.libraries, totalSize: 2, content: [own, other] } },
	});

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await choose(page, /pickup location/i, /main desk/i);
	await page.getByRole("radio", { name: /manual/i }).check();
	await choose(page, /item library/i, /e2e test library/i);
	await choose(page, /item local id/i, /30001/);
	const submit = page.getByRole("button", { name: /^submit$/i });
	await expect(submit).toBeEnabled();

	await choose(page, /item library/i, /second test library/i);

	await expect(page.getByRole("combobox", { name: /item local id/i })).toHaveValue("");
	await expect(submit).toBeDisabled();
});

test("an on-site request's description keeps its note apart from its kind", async ({
	app,
	page,
}) => {
	const traffic = await openForm(app, page, "walk-up");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await choose(page, /pickup location/i, /main desk/i);
	await choose(page, /item local id/i, /30001/);
	await page.getByRole("textbox", { name: /requester note/i }).fill("Please hold");
	await page.getByRole("button", { name: /create request/i }).click();

	await expect.poll(() => traffic.placed.length).toBe(1);
	expect(traffic.placed[0].description).toBe("On site borrowing request: Please hold");
});

test("shows the due date once a walk-up checkout completes", async ({
	app,
	page,
}) => {
	await openForm(app, page, "walk-up");

	await barcode(page).fill("12345");
	await barcode(page).press("Enter");
	await choose(page, /pickup location/i, /main desk/i);
	await choose(page, /item local id/i, /30001/);
	await page.getByRole("button", { name: /create request/i }).click();

	const dialog = page.getByRole("dialog");
	await expect(dialog.getByText(/successfully checked out/i)).toBeVisible({
		timeout: 15_000,
	});
	await expect(dialog.getByText(/2026/)).toBeVisible();
	await expect(dialog.getByText(/still loading|not known yet/i)).toHaveCount(0);
});

for (const type of ["staff", "walk-up"] as const) {
	test(`the ${type} item picker names a copy's volume as the library typed it`, async ({
		app,
		page,
	}) => {
		await openForm(app, page, type, {
			item: { rawVolumeStatement: "Vol [ 22].(1990)", parsedVolumeStatement: "v22y1990" },
		});
		await barcode(page).fill("12345");
		await barcode(page).press("Enter");
		if (type === "staff") {
			await page.getByRole("radio", { name: /manual/i }).check();
			await choose(page, /item library/i, /e2e test library/i);
		}

		await page.getByRole("combobox", { name: /item local id/i }).click();
		const option = page.getByRole("option", { name: /30001/ });
		await expect(option).toContainText("Volume: Vol [ 22].(1990)");
		// The comparison key dcb-service matches volumes by, not something a library wrote
		await expect(option).not.toContainText("v22y1990");
	});
}

// WCAG 1.4.11: an icon is a graphical object, and axe does not measure it
for (const scheme of ["light", "dark", "highContrast"] as const) {
	test(`the requesting dialog's close icon stands out from the dialog (${scheme})`, async ({
		app,
		page,
	}) => {
		await app.useColorScheme(scheme);
		await openForm(app, page, "staff");

		const close = page.getByRole("dialog").getByRole("button", { name: /close/i });
		const { icon, ground } = await close.evaluate((element) => {
			let ground = "rgb(255, 255, 255)";
			for (let node = element.parentElement; node; node = node.parentElement) {
				const background = getComputedStyle(node).backgroundColor;
				if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
					ground = background;
					break;
				}
			}
			return { icon: getComputedStyle(element).color, ground };
		});

		expect(contrast(icon, ground)).toBeGreaterThanOrEqual(3);
	});
}
