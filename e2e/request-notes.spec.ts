import { test, expect } from "./fixtures/test";
import type { Page } from "@playwright/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import { AGENCY_CODE } from "./fixtures/auth";
import type { OperationMocks } from "./fixtures/graphql";

/** Notes on a request's page, behind VITE_FEATURE_REQUEST_NOTES: docs/request-notes.md. */

const BASE = sparse.patronRequests.content[0];
const OTHER = "e2e-other";

const NAMES = {
	libraries: {
		content: [
			{ id: "l-1", fullName: "E2E Test Library", agencyCode: AGENCY_CODE },
			{ id: "l-2", fullName: "Other Branch", agencyCode: OTHER },
		],
	},
};

interface Note {
	id: string;
	authorKind: string;
	agencyCode: string | null;
	libraryName: string | null;
	body: string | null;
	dateCreated: string;
	retracted: boolean;
	retractedBy: string | null;
}

const note = (id: string, agencyCode: string | null, body: string, minute = 0): Note => ({
	id,
	authorKind: agencyCode ? "LIBRARY" : "CONSORTIUM",
	agencyCode,
	libraryName: agencyCode === OTHER ? "Other Branch" : agencyCode ? "E2E Test Library" : null,
	body,
	dateCreated: `2026-10-26T10:${String(minute).padStart(2, "0")}:00Z`,
	retracted: false,
	retractedBy: null,
});

/** A request whose notes and parties the spec decides; dcb-service's paging, newest first. */
const mockRequest = async (
	app: { mockGraphQL: (mocks: OperationMocks) => Promise<void> },
	{ notes, involved }: { notes: Note[]; involved: string[] },
) => {
	const sent: Record<string, unknown>[] = [];
	let current = notes;
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequest: sparse,
		LoadHostLms: { hostLms: { content: [] } },
		LoadLibraryNames: NAMES,
		LoadPatronRequestNotes: (variables: Record<string, unknown>) => {
			const size = Number(variables.pagesize);
			const from = Number(variables.pageno) * size;
			return {
				patronRequests: {
					content: [
						{
							id: BASE.id,
							involvedAgencyCodes: involved,
							notes: { content: current.slice(from, from + size), totalSize: current.length },
						},
					],
				},
			};
		},
		AddPatronRequestNote: (variables: Record<string, unknown>) => {
			sent.push(variables);
			const added = note(`n-${current.length + 1}`, String(variables.agencyCode), String(variables.body), 59);
			current = [added, ...current];
			return { addPatronRequestNote: { id: added.id } };
		},
		RetractPatronRequestNote: (variables: Record<string, unknown>) => {
			sent.push(variables);
			current = current.map((n) =>
				n.id === variables.id ? { ...n, body: null, retracted: true, retractedBy: "LIBRARY" } : n,
			);
			return { retractPatronRequestNote: { id: variables.id, retracted: true } };
		},
	});
	return sent;
};

const open = async (page: Page) => {
	await page.goto(`/patronRequests/${BASE.id}`);
	await expect(page.getByRole("heading", { level: 1, name: "Patron request" })).toBeVisible();
};

const notesSection = (page: Page) => page.getByRole("region", { name: "Notes" });

test.describe("Notes on a request", () => {
	test("are absent while the service does not offer them", async ({ app, page }) => {
		await app.signIn();
		let asked = 0;
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: sparse,
			LoadHostLms: { hostLms: { content: [] } },
			LoadPatronRequestNotes: () => {
				asked += 1;
				return { patronRequests: { content: [] } };
			},
		});

		await open(page);
		await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();
		// The section loads lazily: a count of none is only meaningful once nothing is in flight
		await page.waitForLoadState("networkidle");
		await expect(notesSection(page)).toHaveCount(0);
		expect(asked).toBe(0);
	});

	test("are written as the library, checked before sending, and removed only after asking", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_NOTES"]);
		await app.signIn();
		const sent = await mockRequest(app, {
			notes: [note("n-1", OTHER, "Item sent back by courier", 30), note("n-0", null, "Please check the shelf", 10)],
			involved: [AGENCY_CODE, OTHER],
		});

		await open(page);
		const section = notesSection(page);
		await expect(section.getByText("Item sent back by courier")).toBeVisible();
		await expect(section.getByText(/^The consortium, /)).toBeVisible();
		// Neither another library's note nor the consortium's can be removed here
		await expect(section.getByRole("button", { name: /^Remove the note/ })).toHaveCount(0);

		const box = section.getByRole("textbox", { name: "Add a note" });
		await section.getByRole("button", { name: "Add note" }).click();
		await expect(box).toHaveAttribute("aria-invalid", "true");
		await expect(box).toHaveAccessibleDescription("Write the note first.");
		expect(sent).toEqual([]);

		await box.fill("  Patron says <b>two</b> discs are missing  ");
		await section.getByRole("button", { name: "Add note" }).click();
		await expect(section.getByText("Patron says <b>two</b> discs are missing")).toBeVisible();
		expect(sent.at(-1)).toEqual({
			patronRequestId: BASE.id,
			body: "Patron says <b>two</b> discs are missing",
			agencyCode: AGENCY_CODE,
		});
		await expect(box).toHaveValue("");
		await app.expectNoAccessibilityViolations();

		const remove = section.getByRole("button", { name: /^Remove the note E2E Test Library wrote/ });
		await remove.click();
		const confirm = page.getByRole("dialog", { name: "Remove this note?" });
		await confirm.getByRole("button", { name: "Cancel" }).click();
		expect(sent).toHaveLength(1);

		await remove.click();
		await confirm.getByRole("button", { name: "Remove" }).click();
		await expect(section.getByText("Removed by E2E Test Library")).toBeVisible();
		await expect(section.getByText("Patron says <b>two</b> discs are missing")).toHaveCount(0);
		expect(sent.at(-1)).toEqual({ id: "n-3" });
	});

	test("refuse a note longer than dcb-service takes, before sending it", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_NOTES"]);
		await app.signIn();
		const sent = await mockRequest(app, { notes: [], involved: [AGENCY_CODE] });

		await open(page);
		const section = notesSection(page);
		const box = section.getByRole("textbox", { name: "Add a note" });
		await box.fill("x".repeat(2001));
		await section.getByRole("button", { name: "Add note" }).click();

		await expect(box).toHaveAccessibleDescription("A note can be at most 2000 characters.");
		expect(sent).toEqual([]);
	});

	test("ask which library to write as, and page back through older notes", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_NOTES"]);
		await app.signIn({ agencyCode: `${AGENCY_CODE},${OTHER}` });
		const many = Array.from({ length: 25 }, (_, i) => note(`n-${25 - i}`, OTHER, `Note number ${25 - i}`, 25 - i));
		const sent = await mockRequest(app, { notes: many, involved: [AGENCY_CODE, OTHER] });

		await open(page);
		const section = notesSection(page);
		await expect(section.getByText("Note number 25")).toBeVisible();
		await expect(section.getByText("Note number 1", { exact: true })).toHaveCount(0);
		await section.getByRole("button", { name: "Show older notes" }).click();
		await expect(section.getByText("Note number 1", { exact: true })).toBeVisible();
		await expect(section.getByRole("button", { name: "Show older notes" })).toHaveCount(0);

		await section.getByRole("combobox", { name: "Write as" }).click();
		await page.getByRole("option", { name: "Other Branch" }).click();
		await section.getByRole("textbox", { name: "Add a note" }).fill("Shelved in returns");
		await section.getByRole("button", { name: "Add note" }).click();

		await expect(section.getByText("Shelved in returns")).toBeVisible();
		expect(sent.at(-1)).toEqual({ patronRequestId: BASE.id, body: "Shelved in returns", agencyCode: OTHER });
	});

	test("cannot be written by a library that is not party to the request", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_NOTES"]);
		await app.signIn();
		await mockRequest(app, { notes: [note("n-1", OTHER, "Courier booked")], involved: [OTHER] });

		await open(page);
		const section = notesSection(page);
		await expect(section.getByText("Courier booked")).toBeVisible();
		await expect(
			section.getByText("Only the borrowing, supplying and pickup libraries can write a note on this request."),
		).toBeVisible();
		await expect(section.getByRole("textbox", { name: "Add a note" })).toHaveCount(0);
	});
});
