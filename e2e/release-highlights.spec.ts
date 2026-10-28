import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { READ_ONLY_ROLES } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

/** A release's highlights on the first sign-in after it, and again from preferences. */

const RELEASE_NOTES = "https://github.com/openlibraryenvironment/dcb-admin-for-libraries/releases";

/** What the deploy job writes beside the bundle. Without it, the preview answers with its HTML. */
const deployedAs = (page: Page, version: string) =>
	page.route("**/release.json", (route) => route.fulfill({ json: { version } }));

const highlights = (page: Page) => page.getByRole("dialog", { name: /^What's new/ });

/**
 * The page as a build stamped with this commit: a CI build stamps its own, a local one
 * "local", so a test that took the stamp as built would pass in one and fail in the other.
 */
const servedWithBuildStamp = (page: Page, stamp: string) =>
	page.route("**/*", async (route) => {
		if (route.request().resourceType() !== "document") return route.fallback();
		const response = await route.fetch();
		const body = (await response.text()).replace(
			/(<meta name="dcb-admin-for-libraries-build" content=")[^"]*(")/,
			`$1${stamp}$2`,
		);
		await route.fulfill({ response, body });
	});

test.describe("a user who has not seen this release's highlights", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn({ releaseHighlightsSeen: false });
		await app.mockGraphQL({ LoadLibrary: library });
	});

	test("is shown them once, on the first page after signing in", async ({ page }) => {
		await deployedAs(page, "v1.14.0");
		await page.goto("/");

		const dialog = highlights(page);
		await expect(dialog).toHaveAccessibleName("What's new in version 1.14.0");
		await expect(
			dialog.getByRole("heading", {
				level: 3,
				name: "A personalised OpenRS summary for your library",
			}),
		).toBeVisible();
		const notes = dialog.getByRole("link", {
			name: "Read the full release notes on GitHub (opens in a new tab)",
		});
		await expect(notes).toHaveAttribute("href", `${RELEASE_NOTES}/tag/v1.14.0`);
		await expect(notes).toHaveAttribute("target", "_blank");

		await dialog.getByRole("button", { name: "Got it" }).click();
		await expect(dialog).toBeHidden();

		await page.reload();
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(highlights(page)).toHaveCount(0);
	});

	test("counts Escape as seen", async ({ page }) => {
		await deployedAs(page, "v1.14.0");
		await page.goto("/");
		await expect(highlights(page)).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(highlights(page)).toBeHidden();
		await page.reload();
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(highlights(page)).toHaveCount(0);
	});

	test("on a build no release deployed, names no version", async ({ page }) => {
		await page.goto("/");

		await expect(highlights(page)).toHaveAccessibleName("What's new");
		await expect(
			highlights(page).getByRole("link", { name: /full release notes on GitHub/ }),
		).toHaveAttribute("href", RELEASE_NOTES);
	});
});

test.describe("what a deployment's DCB service has", () => {
	const DCB_9_2_0 = [
		"VITE_FEATURE_GUARDED_CLEANUP",
		"VITE_FEATURE_REQUEST_NOTES",
		"VITE_FEATURE_REQUEST_TAGS",
		"VITE_FEATURE_PICKUP_REQUESTS",
	];

	test.beforeEach(async ({ app, page }) => {
		await app.signIn({ releaseHighlightsSeen: false });
		await app.mockGraphQL({ LoadLibrary: library });
		await deployedAs(page, "v2.0.0");
	});

	test("on one without this release's request features, names them as not switched on", async ({
		app,
		page,
	}) => {
		await page.goto("/");

		const dialog = highlights(page);
		await expect(dialog.getByRole("heading", { level: 3 })).toHaveText([
			"A personalised OpenRS summary for your library",
			"Quick walk-up requests for everyone at the desk",
			"Lists you can share, come back to and export",
			"More accessible, and set up the way you work",
			"Not switched on here yet",
		]);
		await expect(dialog.getByRole("listitem").filter({ hasText: "needs DCB service" })).toHaveText([
			"New request clean-up: needs DCB service 9.0.0 or later",
			"Notes on requests: needs DCB service 9.2.0 or later",
			"Tags on requests: needs DCB service 9.2.0 or later",
			"Pickup requests: needs DCB service 9.2.0 or later",
		]);
		await app.expectNoAccessibilityViolations();

		await dialog
			.getByRole("link", { name: "Feature availability, in Preferences" })
			.click();
		await expect(dialog).toBeHidden();
		await expect(page).toHaveURL(/\/preferences#feature-availability$/);
		await expect(page.getByRole("heading", { name: "Feature availability" })).toBeVisible();

		await page.reload();
		await expect(page.getByRole("heading", { name: "Feature availability" })).toBeVisible();
		await expect(highlights(page)).toHaveCount(0);
	});

	test("on 9.2.0 with them switched on, describes them and names nothing as missing", async ({
		app,
		page,
	}) => {
		await app.enableFeatures(DCB_9_2_0);
		await page.goto("/preferences");

		const dialog = highlights(page);
		await expect(dialog.getByRole("heading", { level: 3 })).toHaveText([
			"A personalised OpenRS summary for your library",
			"Working together on a request",
			"Quick walk-up requests for everyone at the desk",
			"Lists you can share, come back to and export",
			"More accessible, and set up the way you work",
		]);
		await expect(dialog).toContainText("Collecting here lists what you collect for other libraries");
		await expect(dialog).not.toContainText("needs DCB service");
	});

	test("with one of them left off, names only that one", async ({ app, page }) => {
		await app.enableFeatures(DCB_9_2_0.filter((flag) => flag !== "VITE_FEATURE_REQUEST_NOTES"));
		await page.goto("/preferences");

		const dialog = highlights(page);
		await expect(
			dialog.getByRole("heading", { level: 3, name: "Not switched on here yet" }),
		).toBeVisible();
		await expect(dialog.getByRole("listitem").filter({ hasText: "needs DCB service" })).toHaveText([
			"Notes on requests: needs DCB service 9.2.0 or later",
		]);
	});
});

test("a read-only user is shown only what they can use", async ({ app, page }) => {
	await app.signIn({ roles: READ_ONLY_ROLES, releaseHighlightsSeen: false });
	await app.mockGraphQL({ LoadLibrary: library });
	await app.mockSearch();
	await deployedAs(page, "v1.14.0");
	await page.goto("/requesting");

	const dialog = highlights(page);
	await expect(dialog.getByRole("heading", { level: 3 })).toHaveText([
		"Quick walk-up requests for everyone at the desk",
		"Share and save what a list shows",
		"More accessible, and set up the way you work",
	]);
	await expect(dialog).toContainText("In Preferences, choose your colour scheme");
	await expect(dialog).not.toContainText(/Home page|Insights|export|needs DCB service/i);
});

test("a user who has seen them is not shown them again", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });
	await deployedAs(page, "v1.14.0");
	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expect(highlights(page)).toHaveCount(0);
});

test.describe("preferences", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
	});

	test("name the version, link to its release notes, and show its highlights again", async ({
		page,
	}) => {
		await deployedAs(page, "v1.14.0");
		await page.goto("/preferences");

		const about = page.getByRole("heading", { name: "About DCB Admin for Libraries" });
		await expect(about).toBeVisible();
		await expect(page.getByText("Version 1.14.0", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("link", {
				name: "Release notes for version 1.14.0 on GitHub (opens in a new tab)",
			}),
		).toHaveAttribute("href", `${RELEASE_NOTES}/tag/v1.14.0`);

		const again = page.getByRole("button", { name: "Show what's new in this release" });
		await again.click();
		await expect(highlights(page)).toHaveAccessibleName("What's new in version 1.14.0");
		await highlights(page).getByRole("button", { name: "Got it" }).click();
		await expect(highlights(page)).toBeHidden();
		await expect(again).toBeFocused();
	});

	test("name a build no release deployed by its commit, and link to every release", async ({
		page,
	}) => {
		await servedWithBuildStamp(page, "abc1234");
		await page.goto("/preferences");

		await expect(page.getByText("Development build abc1234", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Release notes on GitHub (opens in a new tab)" }),
		).toHaveAttribute("href", RELEASE_NOTES);
	});

	test("say the version is not known when the build carries no commit either", async ({
		page,
	}) => {
		await servedWithBuildStamp(page, "local");
		await page.goto("/preferences");

		await expect(page.getByText("Version not known", { exact: true })).toBeVisible();
	});
});
