import { test, expect } from "./fixtures/test";
import type { Page } from "@playwright/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import sparse from "./fixtures-data/patronRequest-sparse.json" with { type: "json" };
import audit from "./fixtures-data/audit.json" with { type: "json" };
import { AGENCY_CODE } from "./fixtures/auth";
import { API_BASE } from "./fixtures/runtime-config";
import type { OperationMocks } from "./fixtures/graphql";

/** Tags on a request's page, behind VITE_FEATURE_REQUEST_TAGS: docs/request-tags.md. */

const BASE = sparse.patronRequests.content[0];
const OTHER = "e2e-other";

const VOCABULARY = {
	requestTags: [
		{ code: "DAMAGED", label: "Damaged", description: null, active: true },
		{ code: "SLOW_TO_SHIP", label: "Slow to ship", description: null, active: true },
		{ code: "RETIRED", label: "No longer used", description: null, active: false },
	],
};

const NAMES = {
	libraries: {
		content: [
			{ id: "l-1", fullName: "E2E Test Library", agencyCode: AGENCY_CODE },
			{ id: "l-2", fullName: "Other Branch", agencyCode: OTHER },
		],
	},
};

interface Tag {
	code: string;
	label: string;
	agencyCodes: string[];
	consortium: boolean;
}

/** The page's own documents, and a request whose tags and parties the spec decides. */
const mockRequest = async (
	app: { mockGraphQL: (mocks: OperationMocks) => Promise<void> },
	{ tags, involved }: { tags: Tag[]; involved: string[] },
) => {
	const sent: Record<string, unknown>[] = [];
	let current = tags;
	const answer = (variables: Record<string, unknown>, apply: boolean) => {
		sent.push(variables);
		const code = String(variables.tagCode);
		const by = String(variables.agencyCode);
		const label = VOCABULARY.requestTags.find((tag) => tag.code === code)?.label ?? code;
		const existing = current.find((tag) => tag.code === code);
		current = apply
			? existing
				? current.map((tag) => (tag.code === code ? { ...tag, agencyCodes: [...tag.agencyCodes, by] } : tag))
				: [...current, { code, label, agencyCodes: [by], consortium: false }]
			: current
					.map((tag) => (tag.code === code ? { ...tag, agencyCodes: tag.agencyCodes.filter((c) => c !== by) } : tag))
					.filter((tag) => tag.agencyCodes.length > 0 || tag.consortium);
		return current;
	};
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraryBasics: library,
		LoadPatronRequest: sparse,
		LoadHostLms: { hostLms: { content: [] } },
		GetAuditsByPatronRequest: audit,
		LoadLibraryNames: NAMES,
		LoadRequestTags: VOCABULARY,
		LoadPatronRequestTags: () => ({
			patronRequests: { content: [{ id: BASE.id, tags: current, involvedAgencyCodes: involved }] },
		}),
		TagPatronRequest: (variables: Record<string, unknown>) => ({ tagPatronRequest: answer(variables, true) }),
		UntagPatronRequest: (variables: Record<string, unknown>) => ({ untagPatronRequest: answer(variables, false) }),
	});
	return sent;
};

const open = async (page: Page) => {
	await page.goto(`/patronRequests/${BASE.id}`);
	await expect(page.getByRole("heading", { level: 1, name: "Patron request" })).toBeVisible();
};

const tagsSection = (page: Page) => page.getByRole("region", { name: "Tags" });

test.describe("Tags on a request", () => {
	test("are absent while the service does not offer them", async ({ app, page }) => {
		await app.signIn();
		let asked = 0;
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadPatronRequest: sparse,
			LoadHostLms: { hostLms: { content: [] } },
			LoadPatronRequestTags: () => {
				asked += 1;
				return { patronRequests: { content: [] } };
			},
		});

		await open(page);

		await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();
		// The section loads lazily: a count of none is only meaningful once nothing is in flight
		await page.waitForLoadState("networkidle");
		await expect(tagsSection(page)).toHaveCount(0);
		expect(asked).toBe(0);
	});

	test("show who applied each, and let the library apply and remove its own", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_TAGS"]);
		await app.signIn();
		const sent = await mockRequest(app, {
			tags: [
				{ code: "DAMAGED", label: "Damaged", agencyCodes: [AGENCY_CODE, OTHER], consortium: true },
			],
			involved: [AGENCY_CODE, OTHER],
		});

		await open(page);
		const section = tagsSection(page);
		await expect(section.getByText("Damaged: E2E Test Library, Other Branch, the consortium")).toBeVisible();
		// Only this library's own application can be removed here
		await expect(section.getByRole("button", { name: /^Remove Damaged/ })).toHaveCount(1);
		await app.expectNoAccessibilityViolations();

		await section.getByRole("combobox", { name: "Tag to add" }).click();
		// Neither the retired tag nor the one this library already applied is offered
		await expect(page.getByRole("option")).toHaveText(["Slow to ship"]);
		await page.getByRole("option", { name: "Slow to ship" }).click();
		await section.getByRole("button", { name: "Add tag" }).click();

		await expect(section.getByText("Slow to ship: E2E Test Library")).toBeVisible();
		expect(sent.at(-1)).toEqual({ patronRequestId: BASE.id, tagCode: "SLOW_TO_SHIP", agencyCode: AGENCY_CODE });

		await section.getByRole("button", { name: "Remove Damaged for E2E Test Library" }).click();
		await expect(section.getByText("Damaged: Other Branch, the consortium")).toBeVisible();
		expect(sent.at(-1)).toEqual({ patronRequestId: BASE.id, tagCode: "DAMAGED", agencyCode: AGENCY_CODE });
	});

	test("ask which library to tag as when the user's account holds more than one involved", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_TAGS"]);
		await app.signIn({ agencyCode: `${AGENCY_CODE},${OTHER}` });
		const sent = await mockRequest(app, { tags: [], involved: [AGENCY_CODE, OTHER] });

		await open(page);
		const section = tagsSection(page);
		await expect(section.getByText("No tags yet.")).toBeVisible();

		await section.getByRole("combobox", { name: "Tag as" }).click();
		await page.getByRole("option", { name: "Other Branch" }).click();
		await section.getByRole("combobox", { name: "Tag to add" }).click();
		await page.getByRole("option", { name: "Damaged" }).click();
		await section.getByRole("button", { name: "Add tag" }).click();

		await expect(section.getByText("Damaged: Other Branch")).toBeVisible();
		expect(sent.at(-1)).toEqual({ patronRequestId: BASE.id, tagCode: "DAMAGED", agencyCode: OTHER });

		// Applied again as the first library, each removal names its library on screen
		await section.getByRole("combobox", { name: "Tag as" }).click();
		await page.getByRole("option", { name: "E2E Test Library" }).click();
		await section.getByRole("combobox", { name: "Tag to add" }).click();
		await page.getByRole("option", { name: "Damaged" }).click();
		await section.getByRole("button", { name: "Add tag" }).click();
		await expect(section.getByRole("button", { name: "Remove for Other Branch: Damaged" })).toHaveText(
			/Remove for Other Branch/i,
		);
		await expect(section.getByRole("button", { name: "Remove for E2E Test Library: Damaged" })).toBeVisible();
	});

	test("are read-only to a library that is not party to the request", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_TAGS"]);
		await app.signIn();
		await mockRequest(app, {
			tags: [{ code: "DAMAGED", label: "Damaged", agencyCodes: [OTHER], consortium: false }],
			involved: [OTHER],
		});

		await open(page);
		const section = tagsSection(page);
		await expect(section.getByText("Damaged: Other Branch")).toBeVisible();
		await expect(
			section.getByText("Only the borrowing, supplying and pickup libraries can tag this request."),
		).toBeVisible();
		await expect(section.getByRole("button", { name: "Add tag" })).toHaveCount(0);
		await expect(section.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
	});

	test("show dcb-service's reason when it refuses a tag", async ({ app, page }) => {
		await app.enableFeatures(["VITE_FEATURE_REQUEST_TAGS"]);
		await app.signIn();
		await mockRequest(app, { tags: [], involved: [AGENCY_CODE] });
		// Registered after the mocks, so it answers first; everything else falls through to them
		await page.route(`${API_BASE}/graphql`, (route) =>
			route.request().postDataJSON()?.operationName === "TagPatronRequest"
				? route.fulfill({ json: { errors: [{ message: "No such tag: DAMAGED." }], data: null } })
				: route.fallback(),
		);

		await open(page);
		const section = tagsSection(page);
		await section.getByRole("combobox", { name: "Tag to add" }).click();
		await page.getByRole("option", { name: "Damaged" }).click();
		await section.getByRole("button", { name: "Add tag" }).click();

		await expect(page.getByRole("alert").filter({ hasText: "No such tag: DAMAGED." })).toBeVisible();
		await expect(section.getByText("No tags yet.")).toBeVisible();
	});
});
