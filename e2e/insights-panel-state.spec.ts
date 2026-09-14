import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * A panel that fails has to say so.
 *
 * Fourteen panels branched on the loading flag and then on the data, so a 500 rendered the
 * "no data" copy. That matters more here than in DCB Admin: this reader has one view of
 * one library and nothing to cross-check it against, so an endpoint that is down and a
 * month with no traffic were the same screen.
 *
 * The assertions are on what the reader sees, not on a role or a class name.
 */

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

const FAILING_PANEL = "**/insights/failure-taxonomy**";

/**
 * The card a heading belongs to.
 *
 * MuiCard-root, not an ancestor-with-a-heading walk: once a heading is wrapped alongside
 * its info button, the nearest ancestor holding it is that wrapper rather than the panel,
 * and the locator silently starts matching two elements instead of the card. This is one
 * of MUI's DOCUMENTED class names, which is the distinction the doctrine draws - a css-
 * hash is not.
 */
const cardFor = (page: Page, heading: string) =>
  page
    .getByRole("heading", { level: 2, name: heading })
    .locator("xpath=ancestor::div[contains(@class,'MuiCard-root')][1]");

/**
 * Wheel down until the panel mounts. Below-the-fold panels render a placeholder until an
 * IntersectionObserver fires, so the heading does not exist to be scrolled to.
 */
async function reveal(page: Page, heading: string) {
  const target = page.getByRole("heading", { level: 2, name: heading });

  for (let i = 0; i < 14 && !(await target.isVisible()); i++) {
    await page.mouse.wheel(0, 1200);
    await expect(page.locator("body")).toBeVisible();
  }

  await expect(target).toBeVisible();
}

test.describe("Insights panel states", () => {
  test.beforeEach(async ({ app }) => {
    await app.signIn();
    await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
    await app.mockGraphQL(mocks);
    await app.mockStats();
  });

  test("a failed panel says it failed, and offers a retry that works", async ({
    page,
  }) => {
    // Registered after mockStats, so this one wins for its path only.
    let failNext = true;
    await page.route(FAILING_PANEL, async (route) => {
      if (failNext) {
        await route.fulfill({ status: 500, json: { message: "boom" } });
        return;
      }
      await route.fulfill({
        json: [{ reason: "NO_ITEMS_SELECTABLE", count: 148 }],
      });
    });

    await page.goto("/insights");
    await reveal(page, "Why requests fail");

    const panel = cardFor(page, "Why requests fail");

    // The message, not the role: this is what the reader is told, and the query client
    // retries once, so the error state arrives after two round trips rather than one.
    await expect(panel).toContainText("This panel could not be loaded.", {
      timeout: 15_000,
    });
    await expect(panel).not.toContainText("No data for the selected period.");

    failNext = false;
    await panel.getByRole("button", { name: "Retry" }).click();

    await expect(panel).not.toContainText("This panel could not be loaded.");
    await expect(panel.locator("svg").first()).toBeVisible();
  });

  test("an empty panel still reads as empty, not as broken", async ({
    page,
  }) => {
    await page.route(FAILING_PANEL, async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/insights");
    await reveal(page, "Why requests fail");

    const panel = cardFor(page, "Why requests fail");

    await expect(panel).toContainText("No data for the selected period.");
    await expect(panel).not.toContainText("This panel could not be loaded.");
  });

  test("the header is five figures, and the rest are a disclosure away", async ({
    page,
  }) => {
    await page.goto("/insights");

    await expect(page.getByText("Net flow")).toBeVisible();
    await expect(page.getByText("Estimated cost avoided")).toBeHidden();

    await page.getByRole("button", { name: "More measures" }).click();
    await expect(page.getByText("Estimated cost avoided")).toBeVisible();
  });

  test("the durations panel names both transit legs, and says when one is unreported", async ({
    page,
  }) => {
    await page.goto("/insights");
    await reveal(page, "How long things take");

    const panel = cardFor(page, "How long things take");

    await expect(panel).toContainText("Transit, outbound");
    await expect(panel).toContainText("502 observations");
    await expect(panel).toContainText("Transit, return");
    await expect(panel).toContainText("Not reported by this system");
  });

  test("a figure explains where it came from, by keyboard alone", async ({
    page,
  }) => {
    await page.goto("/insights");

    // Named for its metric, not "info": a screen-reader user listing the buttons on this
    // page would otherwise hear the same word a dozen times.
    const trigger = page.getByRole("button", {
      name: "How Net flow is calculated",
    });
    await expect(trigger).toBeVisible();

    // Click, not hover. Four paragraphs behind a tooltip meets none of the dismissable,
    // hoverable, persistent requirements of WCAG 2.2 SC 1.4.13.
    await trigger.focus();
    await page.keyboard.press("Enter");

    const popover = page.getByRole("dialog", {
      name: "How Net flow is calculated",
    });
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("What it counts");
    await expect(popover).toContainText("What it does not include");

    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the range change is announced", async ({ page }) => {
    await page.goto("/insights");

    const live = page.locator('[aria-live="polite"]');
    await expect(live).toHaveCount(1);
    await expect(live).toHaveText("Showing 30 days.");

    await page.getByRole("button", { name: "7 days" }).click();
    await expect(live).toHaveText("Showing 7 days.");
  });
});
