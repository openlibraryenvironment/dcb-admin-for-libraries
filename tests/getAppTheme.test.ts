import { describe, expect, it } from "vitest";

import { getAppTheme } from "@/themes";
import { DEFAULT_DISPLAY } from "@/themes/display";

/**
 * Under cssVariables, `theme.spacing(n)` returns a calc() against --mui-spacing
 * with the unit as its FALLBACK - "calc(2 * var(--mui-spacing, 8px))". The
 * fallback is where the built-in density shows up, so that is what these read.
 */
const spacingUnitOf = (theme: { spacing: (n: number) => string }): string =>
	/var\(--mui-spacing,\s*([^)]+)\)/.exec(theme.spacing(2))?.[1] ?? theme.spacing(2);

describe("getAppTheme", () => {
	it("reproduces today's appearance at the defaults", () => {
		expect(spacingUnitOf(getAppTheme())).toBe("8px");
	});

	/**
	 * The reason the theme is BUILT rather than overlaid. `theme.spacing` is a
	 * function; a density merged over a finished theme would replace it with a
	 * number and every `sx={{ p: 2 }}` in the application would throw.
	 */
	it("builds density into spacing, and spacing stays callable", () => {
		const compact = getAppTheme({ ...DEFAULT_DISPLAY, density: "compact" });
		expect(typeof compact.spacing).toBe("function");
		expect(spacingUnitOf(compact)).toBe("6px");
	});

	it("builds text size into the root font size", () => {
		const largest = getAppTheme({ ...DEFAULT_DISPLAY, textSize: "largest" });
		const html = (
			largest.components?.MuiCssBaseline?.styleOverrides as {
				html?: { fontSize?: string };
			}
		)?.html;
		expect(html?.fontSize).toBe("112.5%");
	});

	it("returns the same theme for the same preferences", () => {
		expect(getAppTheme()).toBe(getAppTheme());
		expect(getAppTheme({ ...DEFAULT_DISPLAY, density: "compact" })).toBe(
			getAppTheme({ ...DEFAULT_DISPLAY, density: "compact" }),
		);
	});

	it("returns different themes for different preferences", () => {
		expect(getAppTheme({ ...DEFAULT_DISPLAY, density: "compact" })).not.toBe(
			getAppTheme(),
		);
	});

	/**
	 * Values arrive from storage as often as from code. One written by a later
	 * release, or edited by hand, must render the default rather than put
	 * `undefined` into a CSS declaration.
	 */
	it("falls back to the default for a value it does not know", () => {
		const nonsense = getAppTheme({
			textSize: "enormous",
			density: "airy",
		} as never);
		expect(spacingUnitOf(nonsense)).toBe("8px");
		expect(nonsense).toBe(getAppTheme());
	});

	it("carries all three colour schemes", () => {
		const schemes = (
			getAppTheme() as unknown as {
				colorSchemes?: Record<string, unknown>;
			}
		).colorSchemes;
		expect(Object.keys(schemes ?? {}).sort()).toEqual([
			"dark",
			"highContrast",
			"light",
		]);
	});

	/**
	 * Windows High Contrast Mode, which is the OS replacing every colour - not
	 * our own highContrast scheme. Without the enhancer MUI's borders and focus
	 * rings disappear there, because forced-colors overrides the backgrounds they
	 * were distinguishing themselves against.
	 */
	it("answers the operating system's forced-colors mode", () => {
		// The enhancer spreads forced-colors rules across the components that need
		// them - twenty of them, rather than one place - so this counts rather than
		// naming any single component it might reorganise later.
		const touched = Object.values(getAppTheme().components ?? {}).filter(
			(definition) => JSON.stringify(definition)?.includes("forced-colors"),
		);
		expect(touched.length).toBeGreaterThan(10);
	});
});
