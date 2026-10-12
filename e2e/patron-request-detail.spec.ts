import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import audit from "./fixtures-data/audit.json" with { type: "json" };

const REQUEST = sparse.patronRequests.content[0];
const AUDIT = audit.audits.content[0];

test.describe("Patron request detail", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadPatronRequest: sparse,
			// Unmocked, it is aborted, and the app's error handler leaves for /networkError.
			LoadHostLms: { hostLms: { content: [] } },
			GetAuditsByPatronRequest: audit,
		});
	});

	// GraphQL declares suppliers and the cluster record nullable; suppliers[0]
	// on a null list threw and took the page down.
	test("renders a request with no suppliers and no cluster record", async ({
		page,
	}) => {
		await page.goto(`/patronRequests/${REQUEST.id}`);
		await expect(
			page.getByRole("heading", { level: 1, name: "Patron request" }),
		).toBeVisible();
		for (const tab of ["Supplying", "Bib record"]) {
			await page.getByRole("tab", { name: tab, exact: true }).click();
			await expect(page.getByRole("tabpanel")).toBeVisible();
		}
	});

	// dayjs(null).format() is the current time, so a status that never changed
	// said it changed just now.
	test("shows nothing, not the current time, for a missing date", async ({
		page,
	}) => {
		await page.goto(`/patronRequests/${REQUEST.id}`);
		const changed = page
			.getByRole("term")
			.filter({ hasText: "Status changed" })
			.locator("xpath=following-sibling::dd[1]");
		await expect(changed).toBeVisible();
		await expect(changed).not.toHaveText(/\d{4}-\d{2}-\d{2}/);
	});

	test("says why an action is unavailable, in text the button points at", async ({
		page,
	}) => {
		await page.goto(`/patronRequests/${REQUEST.id}`);
		await expect(
			page.getByRole("button", { name: "Check for updates" }),
		).toHaveAccessibleDescription(/You cannot check for updates .* ERROR/);
		await expect(
			page.getByText(/You cannot check for updates when/),
		).toBeVisible();
	});

	test("opens an audit entry from the keyboard", async ({ page }) => {
		await page.goto(`/patronRequests/${REQUEST.id}`);
		await page.getByRole("tab", { name: "Audit log" }).click();

		const entry = page
			.getByRole("grid", { name: "Audit log" })
			.getByRole("link")
			.first();
		await entry.focus();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(
			new RegExp(`/patronRequests/audits/${AUDIT.id}`),
		);
	});

	test("reads the audit log only when its tab is opened, a page at a time", async ({
		page,
	}) => {
		const documents: { operation: string; query: string; variables: Record<string, unknown> }[] = [];
		page.on("request", (request) => {
			const body = request.postDataJSON?.();
			if (body?.operationName) {
				documents.push({
					operation: body.operationName,
					query: body.query,
					variables: body.variables,
				});
			}
		});
		const auditReads = () =>
			documents.filter(
				({ operation, query }) =>
					operation.startsWith("GetAudit") || /\baudit\s*\{/.test(query),
			);

		await page.goto(`/patronRequests/${REQUEST.id}`);
		await expect(
			page.getByRole("button", { name: "Check for updates" }),
		).toBeVisible();
		expect(auditReads()).toEqual([]);

		await page.getByRole("tab", { name: "Audit log" }).click();
		await expect(
			page.getByRole("grid", { name: "Audit log" }).getByRole("link"),
		).toBeVisible();

		const reads = auditReads();
		expect(reads.map(({ operation }) => operation)).toEqual([
			"GetAuditsByPatronRequest",
		]);
		expect(reads[0].variables.query).toBe(`patronRequest:${REQUEST.id}`);
		expect(Number(reads[0].variables.pagesize)).toBeLessThanOrEqual(100);
		expect(reads[0].query).not.toMatch(/auditData/);
	});

	test("treats an address that is not a request id as not found", async ({
		page,
	}) => {
		const asked: string[] = [];
		page.on("request", (request) => {
			if (request.postDataJSON?.()?.operationName === "LoadPatronRequest") {
				asked.push(request.url());
			}
		});
		await page.goto("/patronRequests/not-a-request");
		await expect(
			page.getByRole("heading", { level: 1, name: "Unable to find the record" }),
		).toBeVisible();
		expect(asked).toEqual([]);
	});
});
