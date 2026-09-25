import { test, expect } from "@playwright/test";

import { useColorScheme } from "./fixtures/color-scheme";

/**
 * Every JS request is ABORTED, so React never mounts and emotion never injects
 * a rule. Whatever the document carries here is what index.html alone produced,
 * which is the thing under test: the scheme has to be on the page before the
 * bundle parses, or a dark-mode user gets a white screen for the duration.
 */
const withoutTheBundle = async (page: import("@playwright/test").Page) => {
	await page.route("**/*.js", (route) => route.abort());
	await page.goto("/login", { waitUntil: "domcontentloaded" });
	await expect(page.locator("#root")).toBeEmpty();
};

test("paints the device's scheme before the bundle parses", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await withoutTheBundle(page);

	await expect(page.locator("html")).toHaveAttribute("data-dark", "");

	// The browser's own dark canvas, which is #121212 - the same colour MUI's
	// dark background.default resolves to, so nothing changes when React lands.
	expect(
		await page.evaluate(
			() => getComputedStyle(document.documentElement).colorScheme,
		),
	).toBe("dark");
});

test("paints a stored choice before the bundle parses", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await useColorScheme(page, "highContrast");
	await withoutTheBundle(page);

	await expect(page.locator("html")).toHaveAttribute("data-highContrast", "");
});

test("a stored choice beats the device", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await useColorScheme(page, "light");
	await withoutTheBundle(page);

	await expect(page.locator("html")).toHaveAttribute("data-light", "");
	await expect(page.locator("html")).not.toHaveAttribute("data-dark", "");
});

test("the mounted application agrees with what was painted", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await page.goto("/login");
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

	// No second attribute: MUI took over the one already there rather than
	// adding its own beside it.
	expect(
		await page.evaluate(() =>
			[...document.documentElement.attributes]
				.map((attribute) => attribute.name)
				.filter((name) => name.startsWith("data-") && name !== "data-motion"),
		),
	).toEqual(["data-dark"]);
});
