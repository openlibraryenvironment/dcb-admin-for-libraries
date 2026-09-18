import { describe, expect, it } from "vitest";
import type { CssVarsTheme } from "@mui/material/styles";

import theme from "@/theme";

// Measures what the theme DECLARES; the axe gate measures what is rendered. The
// gap between them is a token used on a page the gate does not scan, or only
// when a form is in error - which is where error.main hid at 3.85:1.

/** WCAG 1.4.3: body text. */
const AA_TEXT = 4.5;
/** WCAG 1.4.11: a graphical object against what sits beside it. */
const AA_NON_TEXT = 3;

/*
 * createTheme's return type is `Theme`, which does not carry `colorSchemes` -
 * that half is described by `CssVarsTheme`. Reading the schemes off the built
 * theme is the point of this file; a copy of the values would pass while the
 * theme drifted.
 */
const schemes = (theme as unknown as CssVarsTheme).colorSchemes;

type Rgba = [number, number, number, number];

const channel = (value: number): number => {
	const s = value / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

// MUI derives contrastText and the text.* ramp as `rgba(...)`, not hex. Both
// notations are handled; a CSS variable reference is not a colour and is
// rejected loudly rather than measured as NaN.
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
	if (!/^[0-9a-fA-F]{6}$/.test(full)) {
		throw new Error(`not a measurable colour: ${colour}`);
	}
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
	const [a, b] = [luminance(over(rgba(ink), bg)), luminance(bg)];
	const [hi, lo] = a > b ? [a, b] : [b, a];
	return (hi + 0.05) / (lo + 0.05);
};

/**
 * The Data Grid's selected-row tint. Not a theme token - MUI composites it from
 * primary.main at a low alpha - so it is written down here as the measured
 * result, and it is consistently the tighter of the two grounds a row's ink
 * sits on.
 */
const SELECTED_ROW = { light: "#ECF0F3", dark: "#182C38" } as const;

describe.each(["light", "dark"] as const)("%s scheme", (scheme) => {
	const palette = schemes?.[scheme]?.palette;
	if (!palette) throw new Error(`theme has no ${scheme} colour scheme`);

	const p = palette.primary as unknown as Record<string, string>;
	const page = palette.background!.default!;
	const paper = palette.background!.paper!;
	const ink = palette.text!.primary!;
	const row = SELECTED_ROW[scheme];

	/**
	 * The AppBar does NOT use primary.main in dark: enableColorOnDark defaults to
	 * false, so MUI paints it background.paper and only light mode puts the
	 * header's label on the brand colour. Measuring white against #35B7FF here
	 * would report a failure the application does not have.
	 */
	const headerGround = scheme === "light" ? p.main : paper;

	/** Every ink this theme places on a ground, and the ground it lands on. */
	const TEXT_PAIRS: [string, string, string][] = [
		["text.primary / page", ink, page],
		["headerText / header bar", p.headerText, headerGround],
		["navigationText / navigationBackground", p.navigationText, p.navigationBackground],
		[
			"navigationTextActive / navigationBackground",
			p.navigationTextActive,
			p.navigationBackground,
		],
		["subTabText / subTabBackground", p.subTabText, p.subTabBackground],
		[
			"searchResultTitle / searchResultBackground",
			p.searchResultTitle,
			p.searchResultBackground,
		],
		["headingColour / page", p.headingColour, page],
		["hitCountText / page", p.hitCountText, page],
		["primary.main / page", p.main, page],
		["secondary.main / page", palette.secondary!.main!, page],
		["error.main / page", palette.error!.main!, page],
		["error.main / selected row", palette.error!.main!, row],
		["outcomeGood / page", p.outcomeGood, page],
		["outcomeGood / selected row", p.outcomeGood, row],
		["outcomeBad / page", p.outcomeBad, page],
		["outcomeBad / selected row", p.outcomeBad, row],
		// DCBStepIcon paints the step NUMBER on these, at the Avatar's 20px
		// regular - text, so 4.5:1 rather than the 3:1 a glyph would get.
		["iconSymbol / inactiveBackground", p.iconSymbol, p.inactiveBackground],
		["primary.contrastText / primary.main", palette.primary!.contrastText!, p.main],
	];

	it("renders every ink above the text threshold on its own ground", () => {
		const failures = TEXT_PAIRS.filter(([, fg, bg]) => fg && bg)
			.map(([label, fg, bg]) => ({ label, fg, bg, ratio: contrast(fg, bg) }))
			.filter((r) => r.ratio < AA_TEXT)
			.map(
				(r) =>
					`${r.label}: ${r.ratio.toFixed(2)}:1 (${r.fg} on ${r.bg}), needs ${AA_TEXT}:1`,
			);

		// The whole list, not the first failure: a palette change usually breaks
		// several pairs at once and fixing them one run at a time is how a
		// rebalance takes an afternoon.
		expect(failures).toEqual([]);
	});

	it("draws the focus outline visibly against the page", () => {
		expect(contrast(p.outlineColor, page)).toBeGreaterThanOrEqual(AA_NON_TEXT);
	});

	it("measures something, so a broken scan cannot pass vacuously", () => {
		expect(TEXT_PAIRS.filter(([, fg, bg]) => fg && bg).length).toBeGreaterThan(
			12,
		);
	});
});
