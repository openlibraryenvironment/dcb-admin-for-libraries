import type { PaletteOptions } from "@mui/material/styles";

import "./augmentation";

/**
 * The OpenRS palette, one token set per colour scheme.
 *
 * TOKEN SETS, not built themes: `createTheme(builtTheme, overrides)` deep-merges
 * and does not re-derive, which breaks `theme.spacing` - it is a FUNCTION, and a
 * number merged over it makes every `sx={{ p: 2 }}` throw. Anything that varies
 * with a user preference has to be an INPUT to the build, so the build needs the
 * tokens rather than a finished theme.
 *
 * Every ratio quoted in a comment here is measured by tests/themeContrast.test.ts.
 */
export const openRSLight: PaletteOptions = {
	primary: {
		headerText: "#FFFFFF",
		headingColour: "#0C4068",
		hitCountText: "#333333",
		iconSymbol: "#FFFFFF",
		// Carries the white step number in DCBStepIcon, so it is a text ground.
		// #8C8C8C left that number at 3.36:1; this is 4.61:1.
		inactiveBackground: "#757575",
		main: "#0C4068",
		navigationBackground: "#1B76B4",
		// White, because this bar leaves no room for anything dimmer: white
		// itself is only 4.89:1 on it, and #E2EEF6 - which this was, and
		// which the dark scheme can afford at 9.13:1 - is 4.14:1. Selection
		// is carried by weight and the indicator, not by colour.
		navigationText: "#FFFFFF",
		navigationTextActive: "#FFFFFF",
		searchResultBackground: "#F6F9FC",
		searchResultTitle: "#186498",
		outlineColor: "#0C4068",
		subTabBackground: "#E2EEF6",
		subTabText: "#0C4068",
		// Good/bad carried by COLOURED TEXT - see outcomeTextColour.
		// Measured against both grounds this text sits on, white and the
		// selected-row tint #ecf0f3: 7.87 / 6.87 and 5.62 / 4.91.
		//
		// Deliberately not success.main, which is 4.47 on the selected row.
		outcomeGood: "#1b5e20",
		outcomeBad: "#c62828",
	},
	secondary: {
		// Text, not just a fill: an outlined button's label and the cleanup
		// dialog's progress readout both ask for color="secondary".
		// #1e7ebf was 4.38:1 on white - under AA by a tenth.
		main: "#1a6ea8",
	},
	error: {
		// NOT red.A400. MUI paints FormHelperText in the error state from
		// this token, so it is every validation message in the application,
		// and red.A400 is 3.85 against white - under AA on the page the axe
		// gate scans, but only once a form is actually in error, which no
		// scan puts it in. themeContrast.test.ts measures it instead.
		main: "#c62828",
	},
};

export const openRSDark: PaletteOptions = {
	primary: {
		headerText: "#FFFFFF",
		headingColour: "#FFFFFF",
		hitCountText: "#FFFFFF",
		iconSymbol: "#FFFFFF",
		// Carries the white step number in DCBStepIcon, so it is a text ground.
		// #8C8C8C left that number at 3.36:1; this is 4.61:1.
		inactiveBackground: "#757575",
		main: "#35B7FF",
		searchResultBackground: "#424242",
		// The light scheme's #186498 was copied here verbatim, which put it
		// at 1.59:1 on this card. #90CAF9 is 5.74:1 on the same ground.
		searchResultTitle: "#90CAF9",
		navigationBackground: "#0C4068",
		navigationText: "#E2EEF6",
		navigationTextActive: "#FFFFFF",
		outlineColor: "#35B7FF",
		subTabBackground: "#1E3A4C",
		subTabText: "#E2EEF6",
		// Same role, measured on the dark grounds #121212 and the
		// selected-row tint #182c38: 7.92 / 6.10 and 6.27 / 4.83.
		outcomeGood: "#66bb6a",
		outcomeBad: "#e57373",
	},
	secondary: {
		main: "#75BEDB",
	},
	error: {
		// See the light scheme. red.A400 clears AA on the dark page (4.87)
		// but not on the selected row (3.75), so it fails in both schemes -
		// just on different grounds.
		main: "#e57373",
	},
};

/**
 * High contrast: a THIRD colour scheme promising AAA (7:1), light-based.
 * Why light-based, and why every neutral is re-stated: docs/theming.md §3.
 */
export const openRSHighContrast: PaletteOptions = {
	// An extended scheme still has to say which set of MUI defaults it derives
	// from; without it the theme does not build at all.
	mode: "light",
	// Raises MUI's OWN derivations too: contrastText picks its ink against this
	// number rather than the default 3, so a component colour we never wrote
	// down still lands on the right side of AAA.
	contrastThreshold: 7,
	primary: {
		main: "#00407A",
		headerText: "#FFFFFF",
		headingColour: "#000000",
		hitCountText: "#000000",
		iconSymbol: "#FFFFFF",
		// 7.34:1 with the white step number on it. The light scheme's #757575 is
		// 4.61 - fine for AA, not for what this scheme promises.
		inactiveBackground: "#565656",
		// A white bar with black labels, separated from the page by the border the
		// layout already draws rather than by a fill.
		navigationBackground: "#FFFFFF",
		navigationText: "#000000",
		navigationTextActive: "#000000",
		searchResultBackground: "#FFFFFF",
		searchResultTitle: "#00407A",
		outlineColor: "#000000",
		subTabBackground: "#FFFFFF",
		subTabText: "#000000",
		outcomeGood: "#0B4E12",
		outcomeBad: "#8A0000",
	},
	secondary: {
		// Distinct from primary by HUE as well as darkness: at this contrast two
		// dark blues read as the same colour.
		main: "#4A148C",
	},
	error: {
		main: "#8A0000",
	},
	background: {
		default: "#FFFFFF",
		paper: "#FFFFFF",
	},
	text: {
		primary: "#000000",
		secondary: "#000000",
	},
	// Pure black, because a hairline at 1.5:1 is the commonest way a
	// "high contrast" theme still fails to separate anything.
	divider: "#000000",
};
