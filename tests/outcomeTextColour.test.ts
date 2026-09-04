import { describe, expect, it } from "vitest";

import { outcomeTextColour } from "@helpers/outcomeTextColour";

/**
 * The regression this pins is a contrast failure the axe gate caught once it was
 * made to scroll: `success.main` at 4.47:1 on the selected table row in light, and
 * `error.main` (red.A400) at 3.75:1 on the same row in dark - both under 4.5:1.
 *
 * The gate remains the real guard, because it measures the rendered result. This
 * test guards the one thing the gate cannot say: that these panels ask for the
 * OUTCOME tokens rather than the success/error ramp. Reaching back for `.main`
 * would go green in whichever scheme happened to be scanned first.
 */
describe("outcomeTextColour", () => {
	it("asks for the outcome tokens, not the success/error ramp", () => {
		expect(outcomeTextColour(true)).toBe("primary.outcomeGood");
		expect(outcomeTextColour(false)).toBe("primary.outcomeBad");
	});

	it("distinguishes good from bad", () => {
		expect(outcomeTextColour(true)).not.toBe(outcomeTextColour(false));
	});

	// The tokens are per colour scheme in the theme, so the helper takes no mode -
	// reading theme.palette.mode under cssVariables/colorSchemes returns the default
	// scheme whatever is on screen, which is how dark mode got the light values.
	it("takes no colour-scheme argument", () => {
		expect(outcomeTextColour.length).toBe(1);
	});
});
