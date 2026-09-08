import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Scroll until something a LazyPanel defers has actually mounted.
 *
 * `InsightsDashboard` wraps its panels in `LazyPanel`, which mounts on an
 * IntersectionObserver — so a panel below the fold does not exist in the DOM, and
 * `scrollIntoViewIfNeeded` on a locator inside it can never resolve. It has to be scrolled
 * TO, not scrolled INTO.
 *
 * Driven by the thing it is trying to reveal rather than by a step count. A fixed number of
 * steps is open-loop, and a reveal runs the instant `page.goto` resolves: under parallel load
 * the document at that moment is shorter than the viewport, so every step is spent against a
 * page with nothing to scroll, the panels render below the fold afterwards, and no observer
 * ever fires. The accessibility gate then scanned eleven headings out of twenty-five and
 * reported no violations over the fifteen panels it exists to cover. Observed at ten
 * concurrent workers; CI (workers: 1) rendered fast enough to hide it.
 *
 * Polling fixes that because a pass costs nothing while the page is still empty and starts
 * doing work the moment there is any. One viewport per pass, not a jump to the bottom: an
 * observer whose sentinel never crosses the viewport never fires, and the poll interval is
 * what gives each newly mounted panel a frame to paint and a fetch to land.
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
