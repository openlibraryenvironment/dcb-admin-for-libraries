import { test, expect } from "./fixtures/test";

const DISCOVERY = "**/.well-known/openid-configuration";

test.describe("Logout", () => {
	test("without a session, says you are logged out rather than waiting", async ({
		page,
	}) => {
		await page.goto("/logout");

		await expect(
			page.getByRole("heading", { level: 1, name: "Logged out" }),
		).toBeVisible();
		await expect(page).toHaveURL(/loggedOut=true/);
		await expect(page).toHaveTitle(/^Logout · DCB Admin for Libraries$/);
		await expect(page.getByRole("main")).toHaveCount(1);
	});

	test("names its spinner while signing out", async ({ app, page }) => {
		await app.signIn();
		let release!: () => void;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(DISCOVERY, async (route) => {
			await held;
			await route.fulfill({ status: 503, body: "" });
		});

		await page.goto("/logout");

		await expect(
			page.getByRole("progressbar", { name: "Logging you out" }),
		).toBeVisible();
		release();
	});

	test("says so when signing out fails, and offers to try again", async ({
		app,
		page,
	}) => {
		await app.signIn();
		await page.route(DISCOVERY, (route) =>
			route.fulfill({ status: 503, body: "" }),
		);

		await page.goto("/logout");

		await expect(page.getByRole("alert")).toContainText(
			/error during logout/i,
		);
		await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
	});

	// A library desk is a shared machine: the next person should not inherit these.
	test("forgets the library chosen and the Insights cost, but not display settings", async ({
		app,
		page,
	}) => {
		await app.useColorScheme("dark");
		await app.signIn();
		await page.addInitScript(() => {
			if (sessionStorage.getItem("__e2e_user_state_seeded__")) return;
			sessionStorage.setItem("__e2e_user_state_seeded__", "1");
			localStorage.setItem(
				"root:selected-agency-code",
				JSON.stringify({ state: { selected: "e2e-agency-2" }, version: 0 }),
			);
			localStorage.setItem(
				"root:dcb-insights-ill-cost",
				JSON.stringify({ state: { illUnitCost: 42, currency: "GBP" }, version: 0 }),
			);
		});
		await page.route(DISCOVERY, (route) => route.fulfill({ status: 503, body: "" }));

		await page.goto("/logout");
		await expect(page.getByRole("alert")).toContainText(/error during logout/i);

		const kept = await page.evaluate(() => Object.keys(localStorage).sort());
		expect(kept).not.toContain("root:selected-agency-code");
		expect(kept).not.toContain("root:dcb-insights-ill-cost");
		expect(kept).toContain("root:dcb-admin-libraries-theme");
	});
});

