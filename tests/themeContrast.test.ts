import { describe, expect, it } from "vitest";
import type { CssVarsTheme } from "@mui/material/styles";

import theme from "@/theme";

/*
 * createTheme's return type is `Theme`, which does not carry `colorSchemes` -
 * that half is described by `CssVarsTheme`, and the two are merged only at the
 * ThemeProvider boundary. Reading the schemes off the built theme is the point
 * of this file (a copy of the values would pass while the theme drifted), so
 * the two types are joined here rather than the values duplicated.
 */
const schemes = (theme as unknown as CssVarsTheme).colorSchemes;

// Measures what the theme DECLARES; the axe gate measures what is rendered. The
// gap between them is a token used on a page the gate does not scan, or only
// when a form is in error - which is where error.main hid at 3.85:1.

/** WCAG 1.4.3: body text. */
const AA_TEXT = 4.5;

/**
 * The grounds this application's ink sits on. `selectedRow` is the Data Grid's
 * tint and consistently the tighter of the two, so a token measured only
 * against the page passes and then fails on a selected row.
 */
const GROUND = {
	light: { page: "#FFFFFF", selectedRow: "#ECF0F3" },
	dark: { page: "#121212", selectedRow: "#182C38" },
} as const;

const channel = (value: number): number => {
	const s = value / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const rgb = (colour: string): [number, number, number] => {
	const hex = colour.replace("#", "");
	const full =
		hex.length === 3
			? hex
					.split("")
					.map((c) => c + c)
					.join("")
			: hex;
	const at = (i: number) => parseInt(full.slice(i, i + 2), 16);
	return [at(0), at(2), at(4)];
};

const luminance = (colour: string): number => {
	const [r, g, b] = rgb(colour);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrast = (a: string, b: string): number => {
	const [l1, l2] = [luminance(a), luminance(b)];
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Reads a scheme's palette off the built theme rather than a copy of the values. */
const paletteFor = (scheme: "light" | "dark") => {
	const palette = schemes?.[scheme]?.palette;
	if (!palette) throw new Error(`theme has no ${scheme} colour scheme`);
	return palette;
};

describe("theme contrast", () => {
	describe.each(["light", "dark"] as const)("%s scheme", (scheme) => {
		const palette = paletteFor(scheme);
		const grounds = GROUND[scheme];

		/**
		 * error.main is not only the Alert ramp: MUI paints FormHelperText in the
		 * error state from it, so this token is every Yup message in the
		 * application. It was red.A400 (#ff1744), which is 3.85:1 on white - so
		 * every validation message in light mode was under AA, on a page the axe
		 * gate scans but never with an error on screen.
		 */
		it.each(Object.entries(grounds))(
			"error.main reads as text on the %s ground",
			(_name, ground) => {
				expect(contrast(palette.error!.main!, ground)).toBeGreaterThanOrEqual(
					AA_TEXT,
				);
			},
		);

		/** The outcome pair the insights panels colour good/bad results with. */
		it.each(Object.entries(grounds))(
			"outcome tokens read as text on the %s ground",
			(_name, ground) => {
				expect(
					contrast(palette.primary!.outcomeGood!, ground),
				).toBeGreaterThanOrEqual(AA_TEXT);
				expect(
					contrast(palette.primary!.outcomeBad!, ground),
				).toBeGreaterThanOrEqual(AA_TEXT);
			},
		);
	});
});
