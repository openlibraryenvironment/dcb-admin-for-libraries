import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Scroll until something a LazyPanel defers has actually mounted.
 *
 * A panel below the fold does not exist in the DOM, so it has to be scrolled TO, not
 * scrolled INTO. Polled rather than stepped, and why: docs/testing.md, "Revealing a page
 * before scanning it".
 */
export async function scrollUntilPresent(page: Page, locator: Locator) {
	await expect
		.poll(
			async () => {
				await page.evaluate(() =>
					window.scrollBy(0, Math.max(window.innerHeight - 100, 200)),
				);
				return locator.count();
			},
			{
				message:
					"scrolled to the bottom without the deferred panel ever mounting",
				timeout: 30_000,
			},
		)
		.toBeGreaterThan(0);
}
