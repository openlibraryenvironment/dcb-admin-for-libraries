import { createTheme, type Theme } from "@mui/material/styles";

import "./augmentation";
import { components } from "./components";
import {
	DEFAULT_DISPLAY,
	DENSITIES,
	isDisplayValue,
	rootFontSize,
	spacingUnit,
	TEXT_SIZES,
	type ThemeDisplay,
} from "./display";
import { openRSDark, openRSLight } from "./tokens";
import { typography } from "./typography";

export type { ThemeDisplay } from "./display";

/**
 * Builds a theme for a set of display preferences.
 *
 * BUILDS rather than overlays: `theme.spacing` is a function, and a number
 * merged over it makes every `sx={{ p: 2 }}` throw.
 *
 * The colour schemes stay - thirteen files read `var(--mui-palette-*)` and
 * `useColorScheme()` drives the data attribute. Only the preferences that are
 * NOT the colour scheme get built in.
 */
const buildTheme = (display: ThemeDisplay): Theme =>
	createTheme({
		cssVariables: {
			colorSchemeSelector: "data",
		},
		colorSchemes: {
			light: { palette: openRSLight },
			dark: { palette: openRSDark },
		},
		spacing: spacingUnit(display.density),
		typography,
		components: {
			...components,
			MuiCssBaseline: {
				styleOverrides: {
					html: {
						// The text-size preference. Every size in `typography` that is in
						// `rem` moves with this one declaration; a px size does not.
						fontSize: rootFontSize(display.textSize),
					},
				},
			},
		},
	});

/**
 * A theme per distinct set of preferences.
 *
 * A Map rather than a React memo because the theme is needed outside a React
 * tree - tests/themeContrast.test.ts reads it directly - and because the key
 * space is a handful of combinations, not something that grows with use.
 */
const cache = new Map<string, Theme>();

export const getAppTheme = (
	display: ThemeDisplay = DEFAULT_DISPLAY,
): Theme => {
	// Validated on the way in, because these values arrive from storage as often
	// as from code, and an unknown one must render the default rather than put
	// `undefined` into a CSS declaration.
	const textSize = isDisplayValue(TEXT_SIZES, display?.textSize)
		? display.textSize
		: DEFAULT_DISPLAY.textSize;
	const density = isDisplayValue(DENSITIES, display?.density)
		? display.density
		: DEFAULT_DISPLAY.density;

	const key = `${textSize}:${density}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const built = buildTheme({ textSize, density });
	cache.set(key, built);
	return built;
};

/** The theme at its defaults - today's appearance, and the initial render. */
export const openRSTheme = getAppTheme();

export default openRSTheme;
