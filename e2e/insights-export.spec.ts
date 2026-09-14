import { test, expect } from "./fixtures/test";
import library from "./fixtures-data/library.json" with { type: "json" };

/**
 * The numbers on a panel, as a file.
 *
 * The composition is unit tested; what this covers is that the button is reachable, that
 * the download happens, and that the file states its scope and window - a CSV of figures
 * with no statement of what they cover becomes wrong the moment it is forwarded, and this
 * reader is the one most likely to forward it to somebody who was not there.
 */

const mocks = { LoadLibrary: library, LoadLibraryBasics: library };

test.describe("Insights export", () => {
  test.beforeEach(async ({ app }) => {
    await app.signIn();
    await app.enableFeatures(["VITE_FEATURE_INSIGHTS"]);
    await app.mockGraphQL(mocks);
    await app.mockStats();
  });

  test("a panel's figures download as a CSV that says what they are", async ({
    page,
  }) => {
    await page.goto("/insights?tab=gaps&range=30d");

    const button = page.getByRole("button", {
      name: "Download Unmet local demand as CSV",
    });

    for (let i = 0; i < 12 && !(await button.isVisible()); i++) {
      await page.mouse.wheel(0, 1200);
      await expect(page.locator("body")).toBeVisible();
    }

    const download = page.waitForEvent("download");
    await button.click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(
      /^unmet-local-demand-\d{4}-\d{2}-\d{2}\.csv$/,
    );

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString("utf8");

    expect(csv).toContain("Unmet local demand");
    expect(csv).toContain("Scope,This library");
    expect(csv).toContain("Period,30 days");
    expect(csv).toMatch(/Generated,\d{4}-\d{2}-\d{2}T/);
  });

  test("the export button is named for its panel, not just Download", async ({
    page,
  }) => {
    await page.goto("/insights?tab=gaps");

    // A reader listing this page's controls would otherwise hear the same word beside
    // every figure on it.
    await expect(
      page.getByRole("button", { name: "Download", exact: true }),
    ).toHaveCount(0);
  });
});
