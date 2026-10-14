import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/** A release's highlights on the first sign-in after it, and again from settings. */

const RELEASE_NOTES = "https://github.com/openlibraryenvironment/dcb-admin-for-libraries/releases";

/** What the deploy job writes beside the bundle. Without it, the preview answers with its HTML. */
const deployedAs = (page: Page, version: string) =>
	page.route("**/release.json", (route) => route.fulfill({ json: { version } }));

const highlights = (page: Page) => page.getByRole("dialog", { name: /^What's new/ });

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
		await expect(dialog.getByRole("listitem")).toHaveCount(4);
		// The wording is rewritten each release; each item has its heading
		await expect(dialog.getByRole("heading", { level: 3 })).toHaveCount(4);
		const notes = dialog.getByRole("link", { name: /full release notes on GitHub/ });
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

test("a user who has seen them is not shown them again", async ({ app, page }) => {
	await app.signIn();
	await app.mockGraphQL({ LoadLibrary: library });
	await deployedAs(page, "v1.14.0");
	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expect(highlights(page)).toHaveCount(0);
});

test.describe("settings", () => {
	test.beforeEach(async ({ app }) => {
		await app.signIn();
		await app.mockGraphQL({ LoadLibrary: library });
	});

	test("name the version, link to its release notes, and show its highlights again", async ({
		page,
	}) => {
		await deployedAs(page, "v1.14.0");
		await page.goto("/settings");

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

	test("say when the version is not known, and link to every release", async ({ page }) => {
		await page.goto("/settings");

		await expect(page.getByText("Version not known", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Release notes on GitHub (opens in a new tab)" }),
		).toHaveAttribute("href", RELEASE_NOTES);
	});
});
