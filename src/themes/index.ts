import {
	createTheme,
	enhanceHighContrast,
	type PaletteOptions,
	type Theme,
} from "@mui/material/styles";

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
import { openRSDark, openRSHighContrast, openRSLight } from "./tokens";
import { typography } from "./typography";

export type { ThemeDisplay } from "./display";

/**
 * An EXTENDED colour scheme's palette is used verbatim - MUI augments only
 * `light` and `dark` - so the tokens are augmented here first. docs/theming.md §3.
 */
const augment = (palette: PaletteOptions) => createTheme({ palette }).palette;

/**
 * Builds a theme for a set of display preferences. Builds rather than overlays,
 * and keeps the colour schemes as schemes: docs/theming.md §1 and §2.
 *
 * enhanceHighContrast answers the OPERATING SYSTEM's forced-colors mode, which
 * is not our highContrast scheme (§3). It takes a built theme, hence the wrap.
 */
const buildTheme = (display: ThemeDisplay): Theme =>
	enhanceHighContrast(
		createTheme({
			cssVariables: {
				colorSchemeSelector: "data",
			},
			colorSchemes: {
				light: { palette: openRSLight },
				dark: { palette: openRSDark },
				highContrast: { palette: augment(openRSHighContrast) },
			},
			spacing: spacingUnit(display.density),
			typography,
			components: {
				...components,
				MuiCssBaseline: {
					styleOverrides: {
						html: {
							// The text-size preference. Every size in `typography` that is
							// in `rem` moves with this one declaration; a px size does not.
							fontSize: rootFontSize(display.textSize),
						},
					},
				},
			},
		}),
	);

/**
 * A theme per distinct set of preferences.
 *
 * A Map rather than a React memo because the theme is needed outside a React
 * tree - tests read it directly - and because the key space is a handful of
 * combinations, not something that grows with use.
 */
const cache = new Map<string, Theme>();

export const getAppTheme = (display: ThemeDisplay = DEFAULT_DISPLAY): Theme => {
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
