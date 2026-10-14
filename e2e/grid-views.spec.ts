import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { injectRuntimeConfig } from "./fixtures/runtime-config";
import { seedAuth } from "./fixtures/auth";
import { mockGraphQL } from "./fixtures/graphql";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/** A grid's view shared as its address, and saved for the tab: docs/saved-filters.md. */

const BARCODE = "PB8675309";
const ERRORS = JSON.stringify([{ id: 1, field: "status", operator: "is", value: "ERROR" }]);
const FILTERED = `/patronRequests?filters=${encodeURIComponent(ERRORS)}`;

const toolbar = (page: Page) => page.getByRole("toolbar");
const savedFilters = (page: Page) =>
	page.getByRole("dialog", { name: "Saved filters" });

async function openSavedFilters(page: Page) {
	await toolbar(page).getByRole("button", { name: "Saved filters" }).click();
	await expect(savedFilters(page)).toBeVisible();
	return savedFilters(page);
}

test.beforeEach(async ({ app, page }) => {
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	await app.signIn();
});

test("copies the address of the view, filters included", async ({ app, page }) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto(FILTERED);
	await expect(page.getByRole("grid")).toBeVisible();

	await toolbar(page).getByRole("button", { name: "Copy link to this view" }).click();

	await expect(page.getByRole("alert")).toContainText("Link to this view copied.");
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	expect(copied).toBe(page.url());
	expect(new URL(copied).searchParams.get("filters")).toBe(ERRORS);
});

test("a copied link never carries a barcode, and says it left one out", async ({
	app,
	page,
}) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const header = page.getByRole("columnheader", { name: "Patron barcode" });
	await header.hover();
	await header.getByRole("button", { name: /menu/i }).click();
	await page.getByRole("menuitem", { name: "Filter" }).click();
	await page
		.getByRole("tooltip")
		.getByRole("textbox", { name: "Value" })
		.pressSequentially(BARCODE, { delay: 30 });
	// The grid's input waits a moment on typing, so wait for it before closing the panel, while
	// still inside this grid's own debounce
	await expect(
		toolbar(page).getByRole("button", { name: "Show filters, 1 applied" }),
	).toBeVisible();
	await page.keyboard.press("Escape");

	// The link is the grid as shown
	await toolbar(page).getByRole("button", { name: "Copy link to this view" }).click();

	await expect(page.getByRole("alert")).toContainText(
		"It leaves out patron barcode and requester note filters, and search text.",
	);
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	expect(copied).not.toContain(BARCODE);
});

test("saves the view for the tab, and puts it back", async ({ app, page }) => {
	const queries: string[] = [];
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: (variables) => {
			queries.push(String(variables.query));
			return patronRequests;
		},
	});
	await page.goto(`${FILTERED}&sort=${encodeURIComponent("dateCreated:asc")}`);
	await expect(page.getByRole("grid")).toBeVisible();

	let dialog = await openSavedFilters(page);
	await expect(dialog.getByText("No filters saved yet.")).toBeVisible();
	await dialog.getByRole("button", { name: "Save current filters" }).click();
	await expect(dialog.getByText("Give the filters a name.")).toBeVisible();
	await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveAttribute(
		"aria-invalid",
		"true",
	);

	await dialog.getByRole("textbox", { name: "Name" }).fill("Errors, oldest first");
	await dialog.getByRole("button", { name: "Save current filters" }).click();
	await expect(dialog.getByRole("button", { name: /^Errors, oldest first/ })).toBeVisible();
	await dialog.getByRole("button", { name: "Close" }).click();
	await expect(toolbar(page).getByRole("button", { name: "Saved filters" })).toBeFocused();

	// A fresh, unfiltered grid in the same tab, after a reload
	await page.goto("/patronRequests");
	await page.reload();
	await expect(page.getByRole("grid")).toBeVisible();

	dialog = await openSavedFilters(page);
	await dialog.getByRole("button", { name: /^Errors, oldest first/ }).click();

	await expect(savedFilters(page)).toBeHidden();
	await expect.poll(() => new URL(page.url()).searchParams.get("filters")).toBe(ERRORS);
	expect(new URL(page.url()).searchParams.get("sort")).toBe("dateCreated:asc");
	await expect.poll(() => queries.at(-1)).toContain("status:ERROR");
	await expect(
		toolbar(page).getByRole("button", { name: "Show filters, 1 applied" }),
	).toBeVisible();
});

test("deletes a saved view, keeping focus in the dialog", async ({ app, page }) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto(FILTERED);
	await expect(page.getByRole("grid")).toBeVisible();

	const dialog = await openSavedFilters(page);
	await dialog.getByRole("textbox", { name: "Name" }).fill("Errors");
	await dialog.getByRole("button", { name: "Save current filters" }).click();

	await dialog.getByRole("button", { name: "Delete Errors" }).click();

	await expect(dialog.getByText("No filters saved yet.")).toBeVisible();
	await expect(dialog.getByRole("heading", { name: "Your saved filters" })).toBeFocused();
});

test("clearing filters and sort returns the bare address, and keeps focus", async ({
	app,
	page,
}) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto(`${FILTERED}&sort=${encodeURIComponent("dateCreated:asc")}&page=1`);
	await expect(page.getByRole("grid")).toBeVisible();

	const clear = toolbar(page).getByRole("button", { name: "Clear filters and sort" });
	await clear.click();

	await expect.poll(() => new URL(page.url()).search).toBe("");
	await expect(toolbar(page).getByRole("button", { name: "Show filters" })).toBeVisible();
	await expect(clear).toBeFocused();
});

test("offers nothing to save on a grid that is neither filtered nor sorted", async ({
	app,
	page,
}) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto("/patronRequests");
	await expect(page.getByRole("grid")).toBeVisible();

	const dialog = await openSavedFilters(page);
	await expect(dialog.getByText("Filter or sort the grid to save it here.")).toBeVisible();
	await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveCount(0);
});

test("saved views belong to the tab: a new one starts with none", async ({ app, page }) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await page.goto(FILTERED);
	await expect(page.getByRole("grid")).toBeVisible();
	const dialog = await openSavedFilters(page);
	await dialog.getByRole("textbox", { name: "Name" }).fill("Errors");
	await dialog.getByRole("button", { name: "Save current filters" }).click();
	await expect(dialog.getByRole("button", { name: /^Errors/ })).toBeVisible();

	const other = await page.context().newPage();
	await injectRuntimeConfig(other);
	await seedAuth(other);
	await mockGraphQL(other, {
		LoadLibrary: library,
		LoadLibraries: library,
		LoadPatronRequests: patronRequests,
	});
	await other.goto(FILTERED);
	await expect(other.getByRole("grid")).toBeVisible();
	await other.getByRole("toolbar").getByRole("button", { name: "Saved filters" }).click();
	await expect(
		other.getByRole("dialog", { name: "Saved filters" }).getByText("No filters saved yet."),
	).toBeVisible();
});
