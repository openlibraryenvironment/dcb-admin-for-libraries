import type { Browser, Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { API_BASE, injectRuntimeConfig } from "./fixtures/runtime-config";
import { seedAuth } from "./fixtures/auth";
import { mockGraphQL } from "./fixtures/graphql";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * A server-paged grid's filter, sort, page and columns are URL state, readably
 * (docs/url-view-state.md): shareable, bookmarkable, and restored by the back button.
 * The patron barcode and quick-search text are not: they live in the tab's history entry.
 */

const BARCODE = "PB8675309";
const QUICK = "QS4815162342";

interface Sent {
	query: string;
	pageno: number;
	pagesize: number;
	order: string;
	orderBy: string;
}

/** Sixty requests, so the grid has a second and third page. */
async function mockGrid(page: Page): Promise<Sent[]> {
	const sent: Sent[] = [];
	await mockGraphQL(page, {
		LoadLibrary: library,
		LoadLibraries: library,
		LoadLibraryBasics: library,
		// The request a test opens: aborted, its late error would send the page to /networkError
		LoadPatronRequest: { patronRequests: { totalSize: 0, content: [] } },
		LoadHostLms: { hostLms: { content: [] } },
		LoadPatronRequests: (variables) => {
			sent.push(variables as unknown as Sent);
			return {
				patronRequests: { ...patronRequests.patronRequests, totalSize: 60 },
			};
		},
	});
	return sent;
}

async function openInNewContext(browser: Browser, url: string) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await injectRuntimeConfig(page);
	await seedAuth(page);
	const sent = await mockGrid(page);
	await page.goto(url);
	await expect(page.getByRole("grid")).toBeVisible();
	return { context, page, sent };
}

const searchOf = (page: Page) => new URL(page.url()).searchParams;

/** The toolbar's: a filtered column's header carries a "Show filters" button too. */
const filterButton = (page: Page) =>
	page.getByRole("toolbar").getByRole("button", { name: /^Show filters/ });

/** Opens the filter panel on one column and returns its value input. */
async function filterOn(page: Page, column: string) {
	await page
		.getByRole("columnheader", { name: column })
		.hover();
	await page
		.getByRole("columnheader", { name: column })
		.getByRole("button", { name: /menu/i })
		.click();
	await page.getByRole("menuitem", { name: "Filter" }).click();
	return page.getByRole("dialog").getByRole("textbox", { name: "Value" })
		.or(page.getByRole("dialog").getByRole("combobox", { name: "Value" }));
}

test.beforeEach(async ({ app }) => {
	await app.signIn();
});

test("filter, sort and page live in the URL, and back from a request restores them", async ({
	page,
}) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	await (await filterOn(page, "Status")).click();
	await page.getByRole("option", { name: "Completed" }).click();
	await page.keyboard.press("Escape");
	await expect(filterButton(page)).toHaveAccessibleName(
		"Show filters, 1 applied",
	);
	await expect.poll(() => searchOf(page).get("filters")).toContain("COMPLETED");

	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => searchOf(page).get("sort")).toBe("status:asc");

	await page.getByRole("button", { name: "Go to next page" }).click();
	await expect.poll(() => searchOf(page).get("page")).toBe("2");

	const listUrl = page.url();
	const before = sent.at(-1)!;
	expect(before.query).toContain("status:COMPLETED");
	expect(before).toMatchObject({ pageno: 1, order: "status", orderBy: "ASC" });

	await page.getByRole("link", { name: /2026-09-01/ }).first().click();
	await expect(page).toHaveURL(/\/patronRequests\/11111111-/);
	const sentBeforeBack = sent.length;

	await page.goBack();
	await expect(page).toHaveURL(listUrl);
	await expect(page.getByRole("grid")).toBeVisible();
	await expect(filterButton(page)).toHaveAccessibleName(
		"Show filters, 1 applied",
	);
	await expect(
		page.getByRole("columnheader", { name: "Status" }),
	).toHaveAttribute("aria-sort", "ascending");
	await expect(page.getByText(/26–50 of 60/)).toBeVisible();

	const after = sent.slice(sentBeforeBack).at(-1) ?? sent.at(-1)!;
	expect(after).toEqual(before);
});

test("a copied grid link opens the same view in someone else's browser", async ({
	page,
	browser,
}) => {
	await mockGrid(page);
	await page.goto(
		`/patronRequests?page=1&sort=status%3Aasc&filters=${encodeURIComponent(
			JSON.stringify([
				{ id: 1, field: "status", operator: "is", value: "COMPLETED" },
			]),
		)}`,
	);
	await expect(page.getByRole("grid")).toBeVisible();

	const elsewhere = await openInNewContext(browser, page.url());
	await expect(filterButton(elsewhere.page)).toHaveAccessibleName(
		"Show filters, 1 applied",
	);
	await expect(
		elsewhere.page.getByRole("columnheader", { name: "Status" }),
	).toHaveAttribute("aria-sort", "ascending");
	await expect(elsewhere.page.getByText(/26–50 of 60/)).toBeVisible();
	await expect.poll(() => elsewhere.sent.length).toBeGreaterThan(0);
	expect(elsewhere.sent.at(-1)!.query).toContain("status:COMPLETED");
	expect(elsewhere.sent.at(-1)).toMatchObject({
		pageno: 1,
		order: "status",
		orderBy: "ASC",
	});
	await elsewhere.context.close();
});

test("a patron barcode filter never reaches the URL, and survives a reload of the tab only", async ({
	page,
	browser,
}) => {
	const urls: string[] = [];
	page.on("framenavigated", (frame) => {
		if (frame === page.mainFrame()) urls.push(frame.url());
	});
	const sent = await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const value = await filterOn(page, "Patron barcode");
	await value.pressSequentially(BARCODE, { delay: 30 });
	urls.push(page.url());
	await expect
		.poll(() => sent.at(-1)?.query ?? "")
		.toContain(`patronBarcode:${BARCODE}`);
	await page.keyboard.press("Escape");
	urls.push(page.url());

	await page.getByRole("button", { name: "Go to next page" }).click();
	await expect.poll(() => searchOf(page).get("page")).toBe("2");
	expect(sent.at(-1)!.query).toContain(`patronBarcode:${BARCODE}`);

	const sentBeforeReload = sent.length;
	await page.reload();
	await expect(page.getByRole("grid")).toBeVisible();
	await expect(filterButton(page)).toHaveAccessibleName(
		"Show filters, 1 applied",
	);
	await expect.poll(() => sent.length).toBeGreaterThan(sentBeforeReload);
	expect(sent.at(-1)!.query).toContain(`patronBarcode:${BARCODE}`);
	urls.push(page.url());

	for (const url of urls) expect(url).not.toContain(BARCODE);

	const elsewhere = await openInNewContext(browser, page.url());
	await expect(filterButton(elsewhere.page)).toHaveAccessibleName(
		"Show filters",
	);
	await expect.poll(() => elsewhere.sent.length).toBeGreaterThan(0);
	for (const request of elsewhere.sent) {
		expect(request.query).not.toContain(BARCODE);
	}
	await elsewhere.context.close();
});

test("quick-search text is kept in the tab's history entry, never the URL", async ({
	page,
	browser,
}) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests?page=1");
	await expect(page.getByRole("grid")).toBeVisible();

	// The toolbar offers no quick-search box today, so the entry is written the
	// way the grid hook writes it, past the router's own wrapper, and read on reload.
	await page.evaluate((quick) => {
		History.prototype.replaceState.call(
			history,
			{
				...history.state,
				gridPrivate: { mainPatronRequests: { items: [], quickFilterValues: [quick] } },
			},
			"",
		);
	}, QUICK);
	await page.reload();
	await expect(page.getByRole("grid")).toBeVisible();
	await expect.poll(() => sent.at(-1)?.query ?? "").toContain(QUICK);
	expect(page.url()).not.toContain(QUICK);

	await page.getByRole("button", { name: "Go to next page" }).click();
	await expect.poll(() => searchOf(page).get("page")).toBe("2");
	expect(sent.at(-1)!.query).toContain(QUICK);
	expect(page.url()).not.toContain(QUICK);

	const elsewhere = await openInNewContext(browser, page.url());
	await expect.poll(() => elsewhere.sent.length).toBeGreaterThan(0);
	for (const request of elsewhere.sent) {
		expect(request.query).not.toContain(QUICK);
	}
	await elsewhere.context.close();
});

test("a hand-typed junk URL renders the grid with its defaults and sends a valid request", async ({
	page,
}) => {
	const sent = await mockGrid(page);
	await page.goto(
		"/patronRequests?page=-3&pageSize=100000&sort=evil:sideways&filters=%5B%7Bgarbage",
	);
	await expect(page.getByRole("grid")).toBeVisible();
	await expect(filterButton(page)).toHaveAccessibleName("Show filters");
	await expect.poll(() => sent.length).toBeGreaterThan(0);

	for (const request of sent) {
		expect(request.pagesize).toBeLessThanOrEqual(100);
		expect(request).toMatchObject({
			pageno: 0,
			pagesize: 25,
			order: "dateCreated",
			orderBy: "DESC",
		});
		expect(request.query).not.toMatch(/evil|garbage/);
	}
});

test("a server-sorted grid sorts by one column: shift-click replaces the sort", async ({
	page,
}) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => searchOf(page).get("sort")).toBe("status:asc");
	await page
		.getByRole("columnheader", { name: "Request created" })
		.click({ modifiers: ["Shift"] });

	await expect(
		page.locator('[role="columnheader"][aria-sort="ascending"], [role="columnheader"][aria-sort="descending"]'),
	).toHaveCount(1);
	await expect.poll(() => searchOf(page).get("sort")).toMatch(/^dateCreated:/);
	await expect.poll(() => sent.at(-1)?.order).toBe("dateCreated");
});

test("a date typed into the picker filters the requests and reaches the URL", async ({
	page,
}) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const header = page.getByRole("columnheader", { name: "Request created" });
	await header.hover();
	await header.getByRole("button", { name: /menu/i }).click();
	await page.getByRole("menuitem", { name: "Filter" }).click();

	const from = page.getByRole("group", { name: "From" });
	await from.getByRole("spinbutton").first().click();
	// The en-GB picker's own section order: day first, 24-hour
	await page.keyboard.type("011020260930");
	await expect(from.getByRole("spinbutton", { name: "Month" })).toHaveText("10");
	await expect(from.getByRole("spinbutton", { name: "Minutes" })).toHaveText("30");
	await page.keyboard.press("Escape");

	await expect
		.poll(() => searchOf(page).get("filters") ?? "")
		.toMatch(/^dateCreated:between:2026-10-01T\S+\.\.$/);
	await expect.poll(() => sent.at(-1)?.query ?? "").toMatch(/dateCreated:\[2026-10-01T\S+ TO \*\]/);
	await expect(filterButton(page)).toHaveAccessibleName("Show filters, 1 applied");
});

test("opening a column's filter, and removing every filter, leave the address bare", async ({
	page,
}) => {
	await page.clock.install();
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	// An empty row filters nothing, so it is not written, even past the debounce
	await filterOn(page, "Status");
	await page.clock.runFor(1_000);
	expect(searchOf(page).get("filters")).toBeNull();

	await page.keyboard.press("Escape");
	await page.goto(
		`/patronRequests?logic=or&filters=${encodeURIComponent(
			JSON.stringify([
				{ id: 1, field: "status", operator: "is", value: "ERROR" },
				{ id: 2, field: "status", operator: "is", value: "COMPLETED" },
			]),
		)}`,
	);
	await expect(filterButton(page)).toHaveAccessibleName("Show filters, 2 applied");
	await filterButton(page).click();
	await page.getByRole("button", { name: "Remove all" }).click();

	await expect.poll(() => new URL(page.url()).search).toBe("");
});

test("paging inside the debounce lands on the first page of the new filter", async ({
	page,
}) => {
	await page.clock.install();
	const sent = await mockGrid(page);
	await page.goto("/patronRequests?page=2");
	await expect(page.getByRole("grid")).toBeVisible();

	await (await filterOn(page, "Status")).click();
	await page.getByRole("option", { name: "Completed" }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Go to next page" }).click();
	await page.clock.runFor(1_000);

	await expect.poll(() => searchOf(page).get("filters") ?? "").toContain("COMPLETED");
	expect(searchOf(page).get("page")).toBeNull();
	await expect.poll(() => sent.at(-1)?.pageno).toBe(0);
});

test("leaving for the grid's own tab while typing does not bring the filter back", async ({
	page,
}) => {
	await page.clock.install();
	const sent = await mockGrid(page);
	await page.goto(`/patronRequests?sort=${encodeURIComponent("status:asc")}`);
	await expect(page.getByRole("grid")).toBeVisible();

	await (await filterOn(page, "Status")).click();
	await page.getByRole("option", { name: "Completed" }).click();
	await page.keyboard.press("Escape");
	await page.getByRole("tab", { name: "Patron requests" }).click();
	await expect.poll(() => new URL(page.url()).search).toBe("");

	// Past the debounce: nothing writes the abandoned filter back
	await page.clock.runFor(1_000);
	expect(new URL(page.url()).search).toBe("");
	expect(sent.at(-1)!.query).not.toContain("COMPLETED");
});

test("a sort from a later page asks once, for the first page", async ({ page }) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests?page=2");
	await expect(page.getByRole("grid")).toBeVisible();
	await expect.poll(() => sent.length).toBeGreaterThan(0);
	const before = sent.length;

	await page.getByRole("columnheader", { name: "Status" }).click();

	await expect.poll(() => searchOf(page).get("sort")).toBe("status:asc");
	expect(searchOf(page).get("page")).toBeNull();
	await expect.poll(() => sent.length).toBeGreaterThan(before);
	const after = sent.slice(before);
	expect(after.map((request) => [request.order, request.pageno])).toEqual([["status", 0]]);
});

test("a grid's search is cancelled when the user leaves before it answers", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadLibraries: library,
		LoadSupplierRequests: { patronRequests: { totalSize: 0, content: [] } },
		LoadPatronRequests: { patronRequests: { totalSize: 0, content: [] } },
	});
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => (release = resolve));
	let asked = false;
	await page.route(`${API_BASE}/graphql`, async (route) => {
		if (route.request().postDataJSON()?.operationName !== "LoadPatronRequests" || asked) {
			return route.fallback();
		}
		asked = true;
		await held;
		await route.fulfill({ json: { data: { patronRequests: { totalSize: 0, content: [] } } } }).catch(() => undefined);
	});
	const aborted: string[] = [];
	page.on("requestfailed", (request) => {
		if (request.postDataJSON()?.operationName === "LoadPatronRequests") {
			aborted.push(request.failure()?.errorText ?? "");
		}
	});

	await page.goto("/patronRequests");
	await expect.poll(() => asked).toBe(true);
	await page.getByRole("tab", { name: "Requesting" }).click();

	await expect.poll(() => aborted.length).toBe(1);
	release();
});

test("the request grids ask for library names and codes, not every library's full record", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	const operations: string[] = [];
	page.on("request", (request) => {
		const name = request.postDataJSON?.()?.operationName;
		if (name) operations.push(name);
	});

	for (const path of ["/patronRequests", "/supplierRequests"]) {
		await page.goto(path);
		await expect(page.getByRole("grid")).toBeVisible();
	}

	expect(operations).toContain("LoadLibraryFilterOptions");
	expect(operations).not.toContain("LoadLibraries");
});

test("with agency scoping, the patron request grid searches once on a cold load", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.enableFeatures(["VITE_FEATURE_AGENCY_SCOPED_REQUESTS"]);
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequests: patronRequests,
	});
	let librariesAnswered = false;
	await page.route(`${API_BASE}/graphql`, async (route) => {
		if (route.request().postDataJSON()?.operationName !== "LoadLibraryFilterOptions") {
			return route.fallback();
		}
		// Later than the search, as a list of every library is
		await new Promise((resolve) => setTimeout(resolve, 500));
		librariesAnswered = true;
		await route.fulfill({ json: { data: library } });
	});
	let searches = 0;
	page.on("request", (request) => {
		if (request.postDataJSON?.()?.operationName === "LoadPatronRequests") searches += 1;
	});

	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	await expect.poll(() => librariesAnswered).toBe(true);
	await expect(page.getByRole("link", { name: /2026-09-01/ }).first()).toBeVisible();

	expect(searches).toBe(1);
});

test("a request page left before its query fails does not send the reader to the error page", async ({
	page,
}) => {
	await mockGrid(page);
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => (release = resolve));
	let asked = false;
	await page.route(`${API_BASE}/graphql`, async (route) => {
		if (route.request().postDataJSON()?.operationName !== "LoadPatronRequest") {
			return route.fallback();
		}
		asked = true;
		await held;
		await route.abort("failed");
	});
	const failed: string[] = [];
	page.on("requestfailed", (request) => {
		if (request.postDataJSON()?.operationName === "LoadPatronRequest") failed.push(request.url());
	});

	await page.goto("/patronRequests");
	await page.getByRole("link", { name: /2026-09-01/ }).first().click();
	await expect(page).toHaveURL(/\/patronRequests\/11111111-/);
	// In flight, and held, before the reader leaves
	await expect.poll(() => asked).toBe(true);
	await page.goBack();
	await expect(page.getByRole("grid")).toBeVisible();

	// The request fails after the reader has gone. The error page, had it come, is a full
	// page load from the failure's own handler: past two frames, it has started
	release();
	await expect.poll(() => failed.length).toBeGreaterThan(0);
	const stillOn = await page
		.evaluate(
			() =>
				new Promise<string>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve(location.pathname))),
				),
		)
		.catch(() => "navigated away");
	expect(stillOn).toBe("/patronRequests");
	await expect(page).toHaveURL(/\/patronRequests$/);
	await expect(page.getByRole("grid")).toBeVisible();
});
