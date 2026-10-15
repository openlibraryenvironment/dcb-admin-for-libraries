import { parse, visit, type ValueNode } from "graphql";
import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const ENTRY = {
	id: "44444444-4444-4444-8444-444444444444",
	auditDate: "2026-09-03T08:15:00.123456Z",
	briefDescription: "Moved to ERROR",
	fromStatus: "RESOLVED",
	toStatus: "ERROR",
	// The relation can be absent; auditData still names the request.
	patronRequest: null,
	auditData: { patronRequestId: REQUEST_ID },
};
const OLDER = {
	id: "55555555-5555-4555-8555-555555555555",
	briefDescription: "Moved to RESOLVED",
};
const NEWER = {
	id: "66666666-6666-4666-8666-666666666666",
	briefDescription: "Moved to CANCELLED",
};

// Large enough that paging through the request's whole history takes several calls.
const HISTORY_SIZE = 250;

const neighbours = {
	older: { content: [OLDER], totalSize: HISTORY_SIZE },
	newer: { content: [NEWER], totalSize: HISTORY_SIZE },
};

interface AuditCall {
	operation: string;
	pagesizes: number[];
	queries: string[];
}

/** Every `audits` field in a document, with the page size and query it asks for. */
function auditCall(body: {
	operationName: string;
	query: string;
	variables?: Record<string, unknown>;
}): AuditCall {
	const variables = body.variables ?? {};
	const valueOf = (node: ValueNode): unknown =>
		node.kind === "Variable"
			? variables[node.name.value]
			: "value" in node
				? node.value
				: undefined;
	const call: AuditCall = {
		operation: body.operationName,
		pagesizes: [],
		queries: [],
	};
	visit(parse(body.query), {
		Field(field) {
			if (field.name.value !== "audits") return;
			for (const argument of field.arguments ?? []) {
				const value = valueOf(argument.value);
				if (argument.name.value === "pagesize") call.pagesizes.push(Number(value));
				if (argument.name.value === "query") call.queries.push(String(value));
			}
		},
	});
	return call;
}

test.describe("Audit entry", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			GetAuditById: { audits: { content: [ENTRY], totalSize: 1 } },
			GetAuditNeighbours: neighbours,
			GetAuditsByPatronRequest: {
				audits: { content: [ENTRY], totalSize: HISTORY_SIZE },
			},
			LoadPatronRequest: sparse,
			LoadHostLms: { hostLms: { content: [] } },
		});
	});

	test("renders an entry whose request relation is missing, and returns to it", async ({
		page,
	}) => {
		await page.goto(`/patronRequests/audits/${ENTRY.id}`);
		await expect(
			page.getByRole("heading", { level: 1, name: ENTRY.briefDescription }),
		).toBeVisible();

		await page.getByRole("button", { name: /return/i }).click();
		await expect(page).toHaveURL(
			new RegExp(`/patronRequests/${REQUEST_ID}\\?tab=5#auditlog$`),
		);
		await expect(page.getByRole("tab", { name: /audit log/i })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("is headed by what happened, not by its id", async ({ page }) => {
		await page.goto(`/patronRequests/audits/${ENTRY.id}`);

		await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moved to ERROR");
	});

	test("finds its neighbours with one row each, not by reading the whole history", async ({
		page,
	}) => {
		const calls: AuditCall[] = [];
		page.on("request", (request) => {
			const body = request.postDataJSON?.();
			if (body?.operationName?.startsWith("GetAudit")) {
				calls.push(auditCall(body));
			}
		});

		await page.goto(`/patronRequests/audits/${ENTRY.id}`);
		const older = page.getByRole("button", { name: "Older" });
		const newer = page.getByRole("button", { name: "Newer" });
		await expect(older).toBeEnabled();
		await expect(newer).toBeEnabled();

		expect(calls.map(({ operation }) => operation)).toEqual([
			"GetAuditById",
			"GetAuditNeighbours",
		]);
		const [, neighbourCall] = calls;
		expect(neighbourCall.pagesizes).toEqual([1, 1]);
		expect(neighbourCall.queries).toEqual([
			`patronRequest:${REQUEST_ID} AND auditDate:{* TO ${ENTRY.auditDate}}`,
			`patronRequest:${REQUEST_ID} AND auditDate:{${ENTRY.auditDate} TO *}`,
		]);

		await older.click();
		await expect(page).toHaveURL(new RegExp(`/patronRequests/audits/${OLDER.id}$`));
	});

	test("shows the entry before its neighbours arrive", async ({ page }) => {
		const { promise: held, resolve: release } = Promise.withResolvers<void>();
		await page.route(`${API_BASE}/graphql`, async (route) => {
			const operation = route.request().postDataJSON()?.operationName ?? "";
			if (operation.startsWith("GetAudit") && operation !== "GetAuditById") {
				await held;
			}
			await route.fallback();
		});

		await page.goto(`/patronRequests/audits/${ENTRY.id}`);
		await expect(
			page.getByRole("heading", { level: 1, name: ENTRY.briefDescription }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Older" })).toBeDisabled();

		release();
		await expect(page.getByRole("button", { name: "Older" })).toBeEnabled();
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
