import type { Page } from "@playwright/test";

// Mock data for the initial list of mappings
export const mockMappings = {
	referenceValueMappings: {
		totalSize: 2,
		content: [
			{
				id: "1a1a1a",
				fromContext: "DCB",
				fromCategory: "PatronType",
				fromValue: "1",
				toContext: "example-lms",
				toCategory: "patron-type",
				toValue: "Adult",
				lastImported: "2025-08-15T10:00:00Z",
			},
			{
				id: "2b2b2b",
				fromContext: "DCB",
				fromCategory: "Location",
				fromValue: "main",
				toContext: "example-lms",
				toCategory: "branches",
				toValue: "Main Library",
				lastImported: "2025-08-20T14:30:00Z",
			},
		],
	},
};

// Mock data for the 'getLibrary' query
// The status of DENY_LIBRARY_MAPPING_EDIT determines if editing is allowed
const getLibraryResponse = (editingDisabled: boolean) => ({
	libraries: {
		content: [
			{
				agency: {
					hostLms: {
						code: "example-lms",
					},
				},
				functionalSettings: [
					{
						code: "DENY_LIBRARY_MAPPING_EDIT",
						// 'DISABLED' status means editing IS enabled in the UI
						// 'ENABLED' status means editing IS disabled in the UI
						status: editingDisabled ? "ENABLED" : "DISABLED",
					},
				],
			},
		],
	},
});

/**
 * Sets up API mocks for the Mappings page.
 * @param page The Playwright page object.
 * @param options - Configuration for the mocks.
 * @param options.editingDisabled - If true, the getLibrary mock will disable editing.
 */
export async function mockMappingsApi(
	page: Page,
	options: { editingDisabled: boolean }
) {
	await page.route("**/graphql", async (route) => {
		const requestBody = route.request().postDataJSON();

		// Mock for fetching library settings (controls edit button)
		if (requestBody.operationName === "getLibrary") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: getLibraryResponse(options.editingDisabled),
				}),
			});
		}

		// Mock for fetching the list of mappings
		if (requestBody.operationName === "getMappings") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: mockMappings }),
			});
		}

		// Mock for the update mutation
		if (requestBody.operationName === "updateReferenceValueMapping") {
			const updatedRow = {
				...mockMappings.referenceValueMappings.content[0],
				...requestBody.variables.input,
			};
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: { updateReferenceValueMapping: updatedRow },
				}),
			});
		}

		// Allow other requests to pass through
		return route.continue();
	});
}
