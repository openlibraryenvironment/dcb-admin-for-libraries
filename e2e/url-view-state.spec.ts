import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { injectRuntimeConfig } from "./fixtures/runtime-config";
import { seedAuth } from "./fixtures/auth";
import { mockGraphQL } from "./fixtures/graphql";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/** A grid's view in its address, readably, and the reader's last view: docs/url-view-state.md. */

interface Sent {
	query: string;
	pageno: number;
	order: string;
	orderBy: string;
}

const mockGrid = async (page: Page): Promise<Sent[]> => {
	const sent: Sent[] = [];
	await mockGraphQL(page, {
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: (variables) => {
			sent.push(variables as unknown as Sent);
			return { patronRequests: { ...patronRequests.patronRequests, totalSize: 60 } };
		},
	});
	return sent;
};

const search = (page: Page) => decodeURIComponent(new URL(page.url()).search);

/** The address's parameters, in order of name: the order they were written in is the reader's. */
const params = (page: Page) =>
	[...new URL(page.url()).searchParams].map(([key, value]) => `${key}=${value}`).sort();

const filterButton = (page: Page) =>
	page.getByRole("toolbar").getByRole("button", { name: /^Show filters/ });

const filterStatus = async (page: Page, label: string) => {
	const header = page.getByRole("columnheader", { name: "Status" });
	await header.hover();
	await header.getByRole("button", { name: /menu/i }).click();
	await page.getByRole("menuitem", { name: "Filter" }).click();
	await page.getByRole("dialog").getByRole("combobox", { name: "Value" }).click();
	await page.getByRole("option", { name: label }).click();
	await page.keyboard.press("Escape");
};

const notice = (page: Page) => page.getByText("Showing your last view");

const goToRequestsByNavigation = async (page: Page) => {
	await page.getByRole("tab", { name: "Patron requests" }).click();
	await expect(page.getByRole("grid")).toBeVisible();
};

test.beforeEach(async ({ app }) => {
	await app.signIn();
});

test("the address reads as what the grid shows", async ({ page }) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	await filterStatus(page, "Completed");
	await expect.poll(() => search(page)).toBe("?filters=status:COMPLETED");
	await page.getByRole("columnheader", { name: "Status" }).click();
	await page.getByRole("button", { name: "Go to next page" }).click();

	await expect
		.poll(() => search(page))
		.toBe("?filters=status:COMPLETED&sort=status:asc&page=2");
});

test("a link carries the columns, and opens with them in another browser", async ({
	page,
	browser,
}) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const header = page.getByRole("columnheader", { name: "Status" });
	await header.hover();
	await header.getByRole("button", { name: /menu/i }).click();
	await page.getByRole("menuitem", { name: "Hide column" }).click();
	await expect.poll(() => search(page)).toBe("?hide=status");

	const context = await browser.newContext();
	const elsewhere = await context.newPage();
	await injectRuntimeConfig(elsewhere);
	await seedAuth(elsewhere);
	await mockGrid(elsewhere);
	await elsewhere.goto(page.url());
	await expect(elsewhere.getByRole("grid")).toBeVisible();
	await expect(elsewhere.getByRole("columnheader", { name: "Request created" })).toBeVisible();
	await expect(elsewhere.getByRole("columnheader", { name: "Status" })).toHaveCount(0);
	await context.close();
});

test("a bare address opens the reader's last view, says so, and Reset returns the defaults", async ({
	app,
	page,
}) => {
	const sent = await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => search(page)).toBe("?sort=status:asc");
	await expect(notice(page)).toHaveCount(0);

	await page.getByRole("tab", { name: "Home" }).click();
	await goToRequestsByNavigation(page);

	await expect(page).toHaveURL(/\/patronRequests\?sort=status(%3A|:)asc$/);
	await expect(notice(page)).toBeVisible();
	await expect.poll(() => sent.at(-1)?.order).toBe("status");
	await app.expectNoAccessibilityViolations();

	await page.getByRole("button", { name: "Reset to default" }).click();
	await expect.poll(() => search(page)).toBe("");
	await expect(notice(page)).toHaveCount(0);
	// The defaults' page is the one first fetched, so it comes from the cache
	await expect(page.getByRole("columnheader", { name: "Status" })).not.toHaveAttribute(
		"aria-sort",
		"ascending",
	);

	// Reset forgets it: the next bare address opens the defaults
	await page.getByRole("tab", { name: "Home" }).click();
	await goToRequestsByNavigation(page);
	await expect.poll(() => search(page)).toBe("");
});

test("opening a link never replaces the last view (Rule 1)", async ({ page }) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	await filterStatus(page, "Completed");
	await expect.poll(() => search(page)).toBe("?filters=status:COMPLETED");

	// A colleague's link, opened and paged through, but not changed
	await page.goto("/patronRequests?filters=status:ERROR&sort=dateCreated:asc");
	await expect(filterButton(page)).toHaveAccessibleName("Show filters, 1 applied");
	await expect(notice(page)).toHaveCount(0);
	await page.getByRole("button", { name: "Go to next page" }).click();
	await expect.poll(() => search(page)).toContain("page=2");

	await page.getByRole("tab", { name: "Home" }).click();
	await goToRequestsByNavigation(page);
	await expect.poll(() => search(page)).toBe("?filters=status:COMPLETED");
	await expect(notice(page)).toBeVisible();
});

test("Back undoes this visit's changes once, then leaves the grid", async ({ page }) => {
	await mockGrid(page);
	await page.goto("/");
	await goToRequestsByNavigation(page);
	await expect.poll(() => search(page)).toBe("");

	await page.getByRole("columnheader", { name: "Status" }).click();
	await filterStatus(page, "Completed");
	// A changed filter starts on page 1, so page once it has landed
	await expect.poll(() => search(page)).toContain("filters=status:COMPLETED");
	await page.getByRole("button", { name: "Go to next page" }).click();
	await expect
		.poll(() => params(page))
		.toEqual(["filters=status:COMPLETED", "page=2", "sort=status:asc"]);

	// One entry for the whole visit, not one per change
	await page.goBack();
	await expect(page).toHaveURL(/\/patronRequests$/);
	await expect(page.getByRole("grid")).toBeVisible();
	await expect(filterButton(page)).toHaveAccessibleName("Show filters");

	await page.goBack();
	await expect(page).not.toHaveURL(/\/patronRequests/);
});

const openColumnMenu = async (page: Page, column: string) => {
	const header = page.getByRole("columnheader", { name: column });
	await header.hover();
	await header.getByRole("button", { name: /menu/i }).click();
	const menu = page.getByRole("menu");
	await expect(menu).toBeVisible();
	return menu;
};

const headerNames = async (page: Page) =>
	(await page.getByRole("columnheader").allInnerTexts()).map((text) => text.trim()).filter(Boolean);

test("a pinned column is pinned in the link, and pinned where it is opened", async ({
	page,
	browser,
}) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const menu = await openColumnMenu(page, "Status");
	await menu.getByRole("menuitem", { name: "Pin to left" }).click();
	await expect.poll(() => search(page)).toBe("?pinLeft=status");

	const context = await browser.newContext();
	const elsewhere = await context.newPage();
	await injectRuntimeConfig(elsewhere);
	await seedAuth(elsewhere);
	await mockGrid(elsewhere);
	await elsewhere.goto(page.url());
	await expect(
		elsewhere.locator('[role="columnheader"][data-field="status"]'),
	).toHaveClass(/pinnedLeft/);
	await context.close();
});

test("a column moves from the keyboard, and stays moved across a reload", async ({
	app,
	page,
}) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();
	const before = await headerNames(page);
	const status = before.indexOf("Status");
	expect(status).toBeGreaterThan(0);

	const menu = await openColumnMenu(page, "Status");
	await app.expectNoAccessibilityViolations();
	const moveLeft = menu.getByRole("menuitem", { name: "Move left" });
	await moveLeft.focus();
	await page.keyboard.press("Enter");

	await expect.poll(() => search(page)).toMatch(/^\?order=/);
	const after = await headerNames(page);
	expect(after.indexOf("Status")).toBe(status - 1);
	expect(after[status]).toBe(before[status - 1]);

	await page.reload();
	await expect(page.getByRole("grid")).toBeVisible();
	await expect.poll(() => headerNames(page)).toEqual(after);
});

test("Back to a later page under another sort opens that page, and Forward still returns", async ({
	page,
}) => {
	await mockGrid(page);
	await page.goto("/patronRequests?page=3");
	await expect(page.getByText(/51.60 of 60/)).toBeVisible();
	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => search(page)).toBe("?sort=status:asc");

	await page.goBack();
	await expect(page.getByText(/51.60 of 60/)).toBeVisible();
	// MUI X answers a sort prop with page 1 two timer ticks later: past two frames it would have run
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
	);
	expect(search(page)).toBe("?page=3");
	await page.goForward();
	await expect.poll(() => search(page)).toBe("?sort=status:asc");
});

const privateRemoved = (page: Page) =>
	page.getByRole("alert").filter({ hasText: "This link included a patron barcode or requester note filter." });

for (const path of ["/patronRequests", "/supplierRequests"]) {
	test(`a link's patron barcode is removed from ${path}, with nothing left in history, and the reader is told`, async ({
		app,
		page,
	}) => {
		await mockGrid(page);
		await page.goto("/");
		await page.goto(`${path}?filters=patronBarcode:PB8675309&filters=status:COMPLETED`);

		await expect(privateRemoved(page)).toBeVisible();
		await expect.poll(() => search(page)).toBe("?filters=status:COMPLETED");
		await app.expectNoAccessibilityViolations();

		await page.goBack();
		await expect(page).not.toHaveURL(/PB8675309/);
	});
}

test("an old link's JSON barcode filter is removed, and the last view is not put in its place", async ({
	page,
}) => {
	await mockGrid(page);
	await page.goto("/patronRequests");
	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => search(page)).toBe("?sort=status:asc");

	await page.goto(
		`/patronRequests?filters=${encodeURIComponent(JSON.stringify([{ id: 1, field: "patronBarcode", operator: "equals", value: "PB8675309" }]))}`,
	);
	await expect(privateRemoved(page)).toBeVisible();
	await expect(notice(page)).toBeHidden();
	await expect.poll(() => search(page)).toBe("");
});

test("the notice goes when it is dismissed, and when the reader changes the view", async ({ page }) => {
	await mockGrid(page);
	await page.goto("/patronRequests?filters=patronBarcode:PB8675309");
	await privateRemoved(page).getByRole("button", { name: "Close" }).click();
	await expect(privateRemoved(page)).toBeHidden();

	await page.goto("/patronRequests?filters=requesterNote:contains:late");
	await expect(privateRemoved(page)).toBeVisible();
	await page.getByRole("columnheader", { name: "Status" }).click();
	await expect.poll(() => search(page)).toBe("?sort=status:asc");
	await expect(privateRemoved(page)).toBeHidden();
});
