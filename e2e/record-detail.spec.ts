import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

const BIB_ID = "55555555-5555-4555-8555-555555555555";
const LOCATION_ID = "66666666-6666-4666-8666-666666666666";

const bib = {
	id: BIB_ID,
	title: "Middlemarch",
	author: "George Eliot",
	dateCreated: "2026-01-02T03:04:05Z",
	dateUpdated: "2026-01-02T03:04:05Z",
	publisher: "Blackwood",
	placeOfPublication: "Edinburgh",
	// A cataloguer's string, not an instant.
	dateOfPublication: "c1871.",
	canonicalMetadata: { title: "Middlemarch" },
};

test.beforeEach(async ({ app }) => {
	await app.signIn();
});

test("a bib shows its publication date as catalogued", async ({ app, page }) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadBibMainDetails: { sourceBibs: { content: [bib] } },
	});

	await page.goto(`/bibs/${BIB_ID}`);
	await expect(
		page.getByRole("heading", { level: 1, name: "Middlemarch" }),
	).toBeVisible();
	await expect(page.getByText("c1871.")).toBeVisible();
});

test("a bib that does not exist is not found, not a blank page", async ({
	app,
	page,
}) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadBibMainDetails: { sourceBibs: { content: [] } },
	});

	await page.goto(`/bibs/${BIB_ID}`);
	await expect(
		page.getByRole("heading", { level: 1, name: "Unable to find the record" }),
	).toBeVisible();
});

test("a location address that is not an id is not found, without asking", async ({
	app,
	page,
}) => {
	const asked: string[] = [];
	page.on("request", (request) => {
		if (request.postDataJSON?.()?.operationName === "LoadLocation") {
			asked.push(request.url());
		}
	});
	await app.mockGraphQL({ LoadLibrary: library });

	await page.goto("/locations/not-a-location");
	await expect(
		page.getByRole("heading", { level: 1, name: "Unable to find the record" }),
	).toBeVisible();
	expect(asked).toEqual([]);
});

test("a location with no name still has a heading", async ({ app, page }) => {
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLocation: {
			locations: { content: [{ id: LOCATION_ID, name: null, code: "MAIN" }] },
		},
	});

	await page.goto(`/locations/${LOCATION_ID}`);
	await expect(
		page.getByRole("heading", { level: 1, name: "Location" }),
	).toBeVisible();
});
