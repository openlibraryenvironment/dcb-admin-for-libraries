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

type Rgba = [number, number, number, number];

// MUI derives contrastText and the text.* ramp as `rgba(...)`, not hex. Parsing
// those as hex yields NaN, and `NaN >= threshold` is false - so an unparsed ink
// would fail loudly rather than pass silently, but it would fail for the wrong
// reason. Both notations are handled.
const rgba = (colour: string): Rgba => {
	const fn = colour.match(/^rgba?\(([^)]+)\)$/);
	if (fn) {
		const parts = fn[1].split(",").map((p) => parseFloat(p.trim()));
		return [parts[0], parts[1], parts[2], parts[3] ?? 1];
	}
	const hex = colour.replace("#", "");
	const full =
		hex.length === 3
			? hex
					.split("")
					.map((c) => c + c)
					.join("")
			: hex;
	const at = (i: number) => parseInt(full.slice(i, i + 2), 16);
	return [at(0), at(2), at(4), 1];
};

/** A translucent ink is only as dark as what shows through it. */
const over = (fg: Rgba, bg: Rgba): Rgba => [
	fg[0] * fg[3] + bg[0] * (1 - fg[3]),
	fg[1] * fg[3] + bg[1] * (1 - fg[3]),
	fg[2] * fg[3] + bg[2] * (1 - fg[3]),
	1,
];

const luminance = ([r, g, b]: Rgba): number =>
	0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrast = (ink: string, ground: string): number => {
	const bg = rgba(ground);
	const [l1, l2] = [luminance(over(rgba(ink), bg)), luminance(bg)];
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

		/**
		 * DCBStepIcon paints the step NUMBER on these two grounds, at the Avatar's
		 * 20px regular - text, so 4.5:1, not the 3:1 a glyph would get. Both appear
		 * in all three requesting workflows, none of which the axe gate reaches.
		 */
		/**
		 * The main navigation strip and the nested one on detail pages. Two theme
		 * rules used to set the unselected tab's ink and disagree - MuiTabs' own
		 * descendant selector beat MuiTab's root on specificity, so the token the
		 * comment defended was never the one that rendered.
		 */
		it.each([
			["unselected tab", "navigationText", "navigationBackground"],
			["selected tab", "navigationTextActive", "navigationBackground"],
			["sub tab", "subTabText", "subTabBackground"],
		] as const)("the %s reads on its bar", (_name, inkToken, groundToken) => {
			expect(
				contrast(palette.primary![inkToken]!, palette.primary![groundToken]!),
			).toBeGreaterThanOrEqual(AA_TEXT);
		});

		it.each([
			["inactive", "iconSymbol", "inactiveBackground"],
			["active", "contrastText", "main"],
		] as const)(
			"the %s step number reads on its own ground",
			(_name, inkToken, groundToken) => {
				expect(
					contrast(palette.primary![inkToken]!, palette.primary![groundToken]!),
				).toBeGreaterThanOrEqual(AA_TEXT);
			},
		);
	});
});
