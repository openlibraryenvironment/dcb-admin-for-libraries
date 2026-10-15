import type { Locator } from "@playwright/test";

import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };
import patronRequests from "./fixtures-data/patronRequests.json" with { type: "json" };

/**
 * The keyboard focus ring on a contained button was drawn in currentColor,
 * which is the button's contrast text: white on a white card in light mode,
 * near-black on a near-black one in dark. WCAG 2.4.7 and 1.4.11.
 */

const channels = (colour: string): number[] => {
	const match = colour.match(/rgba?\(([^)]+)\)/);
	if (!match) throw new Error(`not a measurable colour: ${colour}`);
	return match[1].split(",").map((part) => parseFloat(part));
};

const luminance = (colour: string): number => {
	const [r, g, b] = channels(colour).map((value) => {
		const s = value / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

const ringOf = (target: Locator) =>
	target.evaluate((element) => {
		const style = getComputedStyle(element);
		let ground = "rgb(255, 255, 255)";
		for (let node = element.parentElement; node; node = node.parentElement) {
			const background = getComputedStyle(node).backgroundColor;
			if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
				ground = background;
				break;
			}
		}
		return {
			colour: style.outlineColor,
			style: style.outlineStyle,
			offset: parseFloat(style.outlineOffset),
			ground,
		};
	});

for (const scheme of ["light", "dark"] as const) {
	test(`a focused contained button shows its ring against the card (${scheme})`, async ({
		app,
		page,
	}) => {
		await app.useColorScheme(scheme);
		await page.goto("/login");

		const button = page.getByRole("button", { name: /sign in with keycloak/i });
		await expect(button).toBeVisible();
		await page.keyboard.press("Tab");
		await expect(button).toBeFocused();

		const ring = await ringOf(button);

		expect(ring.style).toBe("solid");
		expect(ring.offset).toBeGreaterThan(0);
		expect(contrast(ring.colour, ring.ground)).toBeGreaterThanOrEqual(3);
	});

	test(`a focused icon button shows its ring (${scheme})`, async ({ app, page }) => {
		await app.useColorScheme(scheme);
		await app.signIn();
		await app.mockGraphQL({
			LoadLibrary: library,
			LoadLibraries: library,
			LoadPatronRequests: patronRequests,
		});

		await page.goto("/patronRequests");
		const button = page.getByRole("button", { name: "Columns" });
		await expect(button).toBeVisible();
		await button.focus();
		await expect(button).toBeFocused();

		const ring = await ringOf(button);

		expect(ring.style).toBe("solid");
		expect(contrast(ring.colour, ring.ground)).toBeGreaterThanOrEqual(3);
	});
}
