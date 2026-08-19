import type { Page } from "@playwright/test";

export type ColorScheme = "light" | "dark";

/**
 * The theme sets cssVariables.colorSchemeSelector: "data". That is not the same
 * as the attribute name "data-mui-color-scheme": with the shorthand "data", MUI
 * marks the document with a BARE attribute per scheme - data-light / data-dark -
 * and generates its variables under [data-light] / [data-dark]. A spec asserting
 * the wrong attribute would pass a "dark" run that never left light mode.
 *
 * The chosen mode itself lives in localStorage under "mui-mode", which is how a
 * returning user's preference arrives; seeding it before load exercises that
 * path rather than a toggle click.
 */
export const MODE_STORAGE_KEY = "mui-mode";

export const colorSchemeAttribute = (scheme: ColorScheme): string =>
	`data-${scheme}`;

export async function useColorScheme(
	page: Page,
	scheme: ColorScheme,
): Promise<void> {
	await page.addInitScript(
		([key, value]) => {
			window.localStorage.setItem(key, value);
		},
		[MODE_STORAGE_KEY, scheme] as const,
	);
}
