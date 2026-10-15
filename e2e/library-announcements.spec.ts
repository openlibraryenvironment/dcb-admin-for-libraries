import { test, expect } from "./fixtures/test";
import { API_BASE } from "./fixtures/runtime-config";
import library from "./fixtures-data/library.json" with { type: "json" };

const LIBRARY_ID = library.libraries.content[0].id;

const NOTICES = [
	{
		id: "aaaaaaaa-0000-4000-8000-000000000001",
		scopeType: "LIBRARY",
		scopeId: LIBRARY_ID,
		headline: "Requesting paused",
		body: "Requests resume on Monday.",
		urgent: false,
		dismissible: true,
		startsAt: "2026-01-01T00:00:00Z",
		expiresAt: "2099-01-31T23:59:59Z",
	},
	{
		id: "aaaaaaaa-0000-4000-8000-000000000002",
		scopeType: "LIBRARY",
		scopeId: LIBRARY_ID,
		headline: "Branch closed",
		body: "Collect from the central library.",
		urgent: false,
		dismissible: true,
		startsAt: "2020-01-01T00:00:00Z",
		expiresAt: "2020-01-31T23:59:59Z",
	},
];

test.describe("Announcements", () => {
	// Not UTC, so a day computed on the UTC calendar cannot pass for a local one.
	test.use({ timezoneId: "America/Chicago" });

	test.beforeEach(async ({ app }) => {
		await app.enableFeatures(["VITE_FEATURE_ANNOUNCEMENTS"]);
		await app.signIn();
	});

	test("lists the library's notices from the configured API", async ({
		app,
		page,
	}) => {
		const scopes: unknown[] = [];
		await app.mockGraphQL({
			LoadLibraryBasics: library,
			LoadAnnouncements: (variables) => {
				scopes.push(variables.scopeId);
				return { announcements: NOTICES };
			},
		});

		await page.goto("/announcements");

		await expect(page).toHaveTitle(/^Tell your patrons · DCB Admin for Libraries$/);
		// Each notice is a heading under "Your notices"; subtitle1 alone renders an h6.
		await expect(
			page.getByRole("heading", { level: 3, name: "Requesting paused" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 3, name: "Branch closed" }),
		).toBeVisible();
		expect(scopes).toContain(LIBRARY_ID);

		await expect(
			page.getByText(/^Shows until \d{4}-\d{2}-\d{2} \d{2}:\d{2} \S+$/),
		).toHaveCount(2);
		await expect(
			page.getByRole("button", { name: "Take down: Requesting paused" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Take down: Branch closed" }),
		).toBeVisible();
	});

	test("taking a notice down asks first, and Cancel leaves it up", async ({ app, page }) => {
		let deleted = 0;
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraryBasics: library,
			LoadAnnouncements: { announcements: NOTICES },
			DeleteAnnouncement: () => {
				deleted += 1;
				return { deleteAnnouncement: { success: true } };
			},
		});
		await page.goto("/announcements");

		await page.getByRole("button", { name: "Take down: Requesting paused" }).click();
		const confirm = page.getByRole("dialog", { name: "Take down “Requesting paused”?" });
		await expect(confirm).toContainText("This cannot be undone.");
		await confirm.getByRole("button", { name: "Cancel" }).click();
		await expect(confirm).toBeHidden();
		expect(deleted).toBe(0);

		await page.getByRole("button", { name: "Take down: Requesting paused" }).click();
		await confirm.getByRole("button", { name: "Take down", exact: true }).click();
		await expect.poll(() => deleted).toBe(1);
	});

	// Its confirm button is the error colour, which the other scans never open
	for (const scheme of ["light", "dark", "highContrast"] as const) {
		test(`the take-down confirmation meets the floor (${scheme})`, async ({ app, page }) => {
			await app.useColorScheme(scheme);
			await app.mockGraphQL({
				LoadLibrary: library,
				LoadLibraryBasics: library,
				LoadAnnouncements: { announcements: NOTICES },
			});
			await page.goto("/announcements");
			await page.getByRole("button", { name: "Take down: Requesting paused" }).click();
			const confirm = page.getByRole("dialog");
			// Scanned once its fade-in ends, or axe measures the button blended with the backdrop
			await expect
				.poll(() =>
					confirm.evaluate((node) => getComputedStyle(node.parentElement as Element).opacity),
				)
				.toBe("1");

			await app.expectNoAccessibilityViolations();
		});
	}

	test("publishes until the end of the chosen local day, says so, and clears the form", async ({
		app,
		page,
	}) => {
		const published: Record<string, unknown>[] = [];
		await app.mockGraphQL({
			LoadLibraryBasics: library,
			LoadAnnouncements: { announcements: [] },
			CreateAnnouncement: (variables) => {
				published.push(variables.input as Record<string, unknown>);
				return {
					createAnnouncement: {
						id: "aaaaaaaa-0000-4000-8000-000000000003",
						headline: "Requesting paused",
						expiresAt: "2099-01-31T23:59:59Z",
					},
				};
			},
		});

		await page.goto("/announcements");
		await expect(page.getByText("Nothing published.")).toBeVisible();

		const headline = page.getByRole("textbox", { name: /headline/i });
		await headline.fill("Requesting paused");
		await page
			.getByRole("textbox", { name: /what you want to say/i })
			.fill("Requests resume on Monday.");
		const chosenDay = await page.getByLabel(/show until/i).inputValue();

		await page.getByRole("button", { name: /^publish$/i }).click();

		await expect(page.getByRole("status")).toHaveText(/Notice published/);
		await expect(headline).toHaveValue("");
		expect(published).toHaveLength(1);

		const expected = await page.evaluate((day) => {
			const [year, month, date] = day.split("-").map(Number);
			return new Date(year, month - 1, date, 23, 59, 59).toISOString();
		}, chosenDay);
		expect(published[0].expiresAt).toBe(expected);
	});

	test("shows the service's refusal rather than the request", async ({
		app,
		page,
	}) => {
		const refusal = "expiresAt is required";
		await app.mockGraphQL({
			LoadLibraryBasics: library,
			LoadAnnouncements: { announcements: [] },
		});
		await page.route(`${API_BASE}/graphql`, async (route) => {
			if (route.request().postDataJSON()?.operationName !== "CreateAnnouncement") {
				return route.fallback();
			}
			return route.fulfill({
				json: { data: null, errors: [{ message: refusal }] },
			});
		});

		await page.goto("/announcements");
		await page.getByRole("textbox", { name: /headline/i }).fill("Closed");
		await page
			.getByRole("textbox", { name: /what you want to say/i })
			.fill("We are closed.");
		await page.getByRole("button", { name: /^publish$/i }).click();

		const alert = page.getByRole("alert");
		await expect(alert).toHaveText(refusal);
	});
});

test("explains itself, under a heading, when the flag is off", async ({
	app,
	page,
}) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibraryBasics: library });

	await page.goto("/announcements");

	await expect(
		page.getByRole("heading", { level: 1, name: "Tell your patrons" }),
	).toBeVisible();
	await expect(page.getByText(/not available on this deployment/i)).toBeVisible();
});
