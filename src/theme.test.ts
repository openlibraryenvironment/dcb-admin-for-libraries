import { describe, it, expect } from "vitest";

import theme from "./theme";
import { SCROLL_PADDING_TOP, SUBJECT_BAR_TOP } from "@helpers/stickyOffsets";

/**
 * SC 2.4.11, Focus Not Obscured.
 *
 * The Insights subject bar is sticky, so a focused element scrolled to the top of the
 * scrollport lands underneath it unless `scroll-padding-top` clears the bar. Nothing
 * throws when those two numbers disagree - the focus ring is simply somewhere the reader
 * cannot see - so the agreement is asserted rather than left to a comment.
 */
describe("the theme's scroll padding", () => {
  it("clears everything sticky above the content", () => {
    const html = (theme.components?.MuiCssBaseline?.styleOverrides as any)?.html;

    expect(html?.scrollPaddingTop).toBe(`${SCROLL_PADDING_TOP}px`);
    expect(SCROLL_PADDING_TOP).toBeGreaterThan(SUBJECT_BAR_TOP);
  });
});
