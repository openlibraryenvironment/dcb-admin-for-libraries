import { test, expect, type AppFixture } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };

const REQUEST = sparse.patronRequests.content[0];

const openRequest = async (app: AppFixture, status: string) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadPatronRequest: {
			patronRequests: { ...sparse.patronRequests, content: [{ ...REQUEST, status }] },
		},
		// Unmocked, it is aborted, and the app's error handler leaves for /networkError.
		LoadHostLms: { hostLms: { content: [] } },
	});
};

test.describe("Patron request status help", () => {
	test("explains the current status from the keyboard, and gives focus back", async ({
		app,
		page,
	}) => {
		await openRequest(app, "ERROR");
		await page.goto(`/patronRequests/${REQUEST.id}`);

		const trigger = page.getByRole("button", { name: "About Current status" });
		await trigger.focus();
		await page.keyboard.press("Enter");

		const dialog = page.getByRole("dialog", { name: "Current status: Error" });
		await expect(dialog.getByRole("term")).toHaveText(["What it means", "If it stays here"]);
		// This app's own actions, not DCB Admin's menu
		await expect(dialog).toContainText(
			"a library administrator can use 'Clean up' on this page to end it.",
		);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
	});

	test("explains only the attribute for a status the catalogue does not know", async ({
		app,
		page,
	}) => {
		await openRequest(app, "A_STATUS_THE_SERVICE_ADDED_LATER");
		await page.goto(`/patronRequests/${REQUEST.id}`);

		await page.getByRole("button", { name: "About Current status" }).click();

		const dialog = page.getByRole("dialog", { name: "Current status" });
		await expect(dialog).toContainText("OpenRS DCB moves a request through these statuses");
		await expect(dialog.getByRole("term")).toHaveCount(0);
	});

	// en-US carries only what differs, so this page reads from both catalogues at once
	test("reads American English from the overlay and the rest from en-GB", async ({
		app,
		page,
	}) => {
		await app.configure({ VITE_LOCALE: "en-US" });
		await openRequest(app, "CANCELLED");
		await page.goto(`/patronRequests/${REQUEST.id}`);

		await page.getByRole("button", { name: "About Current status" }).click();

		const dialog = page.getByRole("dialog", { name: "Current status: Canceled" });
		await expect(dialog).toContainText("The request was canceled before the item left");
		await expect(dialog).toContainText("OpenRS DCB moves a request through these statuses");
		await expect(dialog).not.toContainText("cancelled");
	});
});
