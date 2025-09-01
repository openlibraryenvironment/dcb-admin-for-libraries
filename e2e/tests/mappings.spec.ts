import { test, expect } from "@playwright/test";
import { mockMappingsApi, mockMappings } from "../mocks/mappings";
// WIP: Need to set up login etc before any of this can work
// Navigate to the page before each test
test.beforeEach(async ({ page }) => {
	// Replace with the actual route to your mappings page
	await page.goto("http://localhost:5173/dcb-admin-for-libraries-dev/mappings");
});

test.describe("Mappings Page", () => {
	// --- Test 1: Visual Rendering in Light and Dark Modes ---
	test("should render correctly in light and dark mode", async ({ page }) => {
		// Mock API with editing disabled for a consistent visual state
		await mockMappingsApi(page, { editingDisabled: true });
		await page.reload();

		// Check light mode
		await expect(page.getByRole("grid")).toBeVisible();
		await expect(page).toHaveScreenshot("mappings-light-mode.png");

		// Switch to dark mode (assuming a data-theme attribute on <html>)
		await page.evaluate(() =>
			document.documentElement.setAttribute("data-theme", "dark")
		);

		// Ensure dark mode styles are applied
		const gridBackgroundColor = await page
			.locator(".MuiDataGrid-root")
			.evaluate((el) => {
				return window.getComputedStyle(el).backgroundColor;
			});
		expect(gridBackgroundColor).not.toBe("rgb(255, 255, 255)"); // Or whatever your light bg color is

		await expect(page).toHaveScreenshot("mappings-dark-mode.png");
	});

	// --- Test 2: Data Rendering and Conditional UI (Editing Disabled) ---
	test("should render mappings and disable editing when DENY_LIBRARY_MAPPING_EDIT is enabled", async ({
		page,
	}) => {
		await mockMappingsApi(page, { editingDisabled: true });
		await page.reload();

		const grid = page.getByRole("grid");
		await expect(grid).toBeVisible();

		// Check if the first row of mock data is rendered
		const firstRow = grid.locator('[data-id="1a1a1a"]');
		await expect(firstRow).toContainText("PatronType");
		await expect(firstRow).toContainText("Adult");

		// Check if the second row of mock data is rendered
		const secondRow = grid.locator('[data-id="2b2b2b"]');
		await expect(secondRow).toContainText("Location");
		await expect(secondRow).toContainText("Main Library");

		// The "Edit" button should be present but disabled
		const editButton = firstRow.getByRole("button", { name: "Edit" });
		await expect(editButton).toBeVisible();
		await expect(editButton).toBeDisabled();
	});

	// --- Test 3: Conditional UI (Editing Enabled) ---
	test("should enable editing when DENY_LIBRARY_MAPPING_EDIT is disabled", async ({
		page,
	}) => {
		await mockMappingsApi(page, { editingDisabled: false });
		await page.reload();

		const grid = page.getByRole("grid");
		await expect(grid).toBeVisible();

		// The "Edit" button should now be enabled
		const editButton = grid
			.locator('[data-id="1a1a1a"]')
			.getByRole("button", { name: "Edit" });
		await expect(editButton).toBeEnabled();
	});

	// --- Test 4: Full Edit Workflow ---
	test("should allow a user to successfully edit a mapping", async ({
		page,
	}) => {
		// Mock the API with editing enabled
		await mockMappingsApi(page, { editingDisabled: false });
		await page.reload();

		const grid = page.getByRole("grid");
		const rowToEdit = grid.locator('[data-id="1a1a1a"]');
		const originalValue =
			mockMappings.referenceValueMappings.content[0].toValue; // 'Adult'
		const updatedValue = "Student";

		// 1. Initial State Check
		await expect(rowToEdit).toContainText(originalValue);

		// 2. Enter Edit Mode
		await rowToEdit.getByRole("button", { name: "Edit" }).click();

		// 3. Find the input and update its value
		// In MUI edit mode, the cell gets a specific class and contains an input
		const toValueInput = rowToEdit
			.locator(".MuiDataGrid-cell--editing")
			.getByRole("textbox");
		await expect(toValueInput).toHaveValue(originalValue);
		await toValueInput.fill(updatedValue);

		// 4. Save the changes for the row
		await rowToEdit.getByRole("button", { name: "Save" }).click();

		// 5. Handle the confirmation modal
		const confirmationDialog = page.getByRole("dialog", {
			name: "Confirm Change",
		});
		await expect(confirmationDialog).toBeVisible();
		await expect(confirmationDialog).toContainText(
			"You are editing the Reference Value Mapping"
		);

		// Fill in the required reason
		await confirmationDialog
			.getByLabel("Reason for change*")
			.fill("E2E test reason");

		// Confirm the submission
		await confirmationDialog.getByRole("button", { name: "Confirm" }).click();

		// 6. Final State Check
		await expect(confirmationDialog).not.toBeVisible();

		// The grid will refetch and display the new value from the mutation mock
		await expect(rowToEdit).toContainText(updatedValue);
		await expect(rowToEdit).not.toContainText(originalValue);
	});
});
