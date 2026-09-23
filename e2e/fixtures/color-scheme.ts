import type { Page } from "@playwright/test";

export type ColorScheme = "light" | "dark" | "highContrast";

/**
 * The theme sets cssVariables.colorSchemeSelector: "data". That is not the same
 * as the attribute name "data-mui-color-scheme": with the shorthand "data", MUI
 * marks the document with a BARE attribute per scheme - data-light / data-dark /
 * data-highContrast - and generates its variables under those selectors. A spec
 * asserting the wrong attribute would pass a "dark" run that never left light.
 */
export const colorSchemeAttribute = (scheme: ColorScheme): string =>
	`data-${scheme}`;

/**
 * The application's OWN store is the source of truth, not MUI's `mui-mode`:
 * useResolvedMode reads it, and DisplayThemeProvider pushes the result into MUI
 * through setColorScheme. Seeding MUI's key instead would be overwritten on the
 * first render, which looks like the scheme silently not applying.
 */
/*
 * Namespaced by storageKey(): sibling apps on one origin share a localStorage.
 * "root" because playwright.config pins VITE_PUBLIC_URL to "/" - a run under a
 * deployment prefix would namespace it by that prefix instead.
 */
const STORE_KEY = "root:dcb-admin-libraries-theme";

export async function useColorScheme(
	page: Page,
	scheme: ColorScheme,
): Promise<void> {
	await page.addInitScript(
		([key, value]) => {
			// Zustand's persist shape. Written before load, so it arrives through
			// the store's own rehydrate path rather than a toggle click.
			window.localStorage.setItem(
				key,
				JSON.stringify({ state: { mode: value }, version: 0 }),
			);
		},
		[STORE_KEY, scheme] as const,
	);
}
