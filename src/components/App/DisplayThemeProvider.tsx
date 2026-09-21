import { useEffect, useMemo, type ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";

import { useResolvedMode } from "@/hooks/useResolvedMode";
import { useThemeStore, type ThemeMode } from "@/hooks/useThemeStore";
import { getAppTheme } from "@/themes";
import { motionAttribute } from "@/themes/display";

/**
 * Pushes the resolved scheme into MUI, which owns the data attribute.
 *
 * `defaultMode` cannot carry it: that prop only accepts light, dark and system,
 * and highContrast is an EXTENDED scheme. setColorScheme is the API that takes
 * one, and it has to be called from inside the provider.
 */
const ColorSchemeSync = ({ mode }: { mode: ThemeMode }) => {
	const { setColorScheme } = useColorScheme();

	useEffect(() => {
		setColorScheme(mode);
	}, [mode, setColorScheme]);

	return null;
};

/**
 * Turns the stored display preferences into the rendered theme.
 *
 * Three of them take three different routes, which is the thing to understand
 * here rather than to rediscover: the colour scheme is an attribute MUI writes,
 * text size and density are built into the theme (docs/theming.md §1), and
 * motion is an attribute that static CSS answers.
 */
export const DisplayThemeProvider = ({ children }: { children: ReactNode }) => {
	// Atomic selectors: destructuring the store would re-render the whole
	// application on every unrelated change to it.
	const textSize = useThemeStore((state) => state.textSize);
	const density = useThemeStore((state) => state.density);
	const motion = useThemeStore((state) => state.motion);
	const mode = useResolvedMode();

	const theme = useMemo(
		() => getAppTheme({ textSize, density }),
		[textSize, density],
	);

	// MUI owns `data-*-color-scheme`; this is the one it does not know about.
	useEffect(() => {
		const attribute = motionAttribute(motion);
		if (attribute === null) {
			document.documentElement.removeAttribute("data-motion");
			return;
		}
		document.documentElement.setAttribute("data-motion", attribute);
	}, [motion]);

	return (
		<ThemeProvider
			theme={theme}
			// noSsr: a client-only SPA does not need the provider to double-render
			// against a hydration mismatch, and without it a theme carrying several
			// colour schemes repaints light before the chosen one on every refresh.
			noSsr
		>
			<CssBaseline />
			<ColorSchemeSync mode={mode} />
			{children}
		</ThemeProvider>
	);
};
