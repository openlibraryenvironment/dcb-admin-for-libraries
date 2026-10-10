import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const ENTRY = {
	id: "44444444-4444-4444-8444-444444444444",
	auditDate: "2026-09-03T08:15:00Z",
	briefDescription: "Moved to ERROR",
	fromStatus: "RESOLVED",
	toStatus: "ERROR",
	// The relation can be absent; auditData still names the request.
	patronRequest: null,
	auditData: { patronRequestId: REQUEST_ID },
};

test.describe("Audit entry", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			GetAuditById: { audits: { content: [ENTRY], totalSize: 1 } },
			GetAuditsByPatronRequest: { audits: { content: [ENTRY], totalSize: 1 } },
			LoadPatronRequest: { patronRequests: { content: [] } },
		});
	});

	test("renders an entry whose request relation is missing, and returns to it", async ({
		page,
	}) => {
		await page.goto(`/patronRequests/audits/${ENTRY.id}`);
		await expect(
			page.getByRole("heading", { level: 1, name: ENTRY.id }),
		).toBeVisible();

		await page.getByRole("button", { name: /return/i }).click();
		await expect(page).toHaveURL(
			new RegExp(`/patronRequests/${REQUEST_ID}#auditlog$`),
		);
	});

	test("treats an address that is not an entry id as not found", async ({
		page,
	}) => {
		const asked: string[] = [];
		page.on("request", (request) => {
			if (request.postDataJSON?.()?.operationName === "GetAuditById") {
				asked.push(request.url());
			}
		});
		await page.goto("/patronRequests/audits/not-an-entry");
		await expect(
			page.getByRole("heading", { level: 1, name: "Unable to find the record" }),
		).toBeVisible();
		expect(asked).toEqual([]);
	});
});
