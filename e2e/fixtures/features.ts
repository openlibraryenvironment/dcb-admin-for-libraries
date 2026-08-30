import type { Page } from "@playwright/test";

/**
 * Runtime feature flags, per spec.
 *
 * The flags live in the same injected runtime config as the rest of the app's
 * settings (window.__APP_ENV__), so they are switched on the same way: an init
 * script that runs before the app boots. Kept OUT of RUNTIME_CONFIG so the
 * default for every spec is "off" - which is the deployed default too, and means
 * a flag turned on here is turned on deliberately.
 *
 * Must be called before the first navigation, like every other init script.
 */
export async function enableFeatures(
	page: Page,
	flags: string[],
): Promise<void> {
	await page.addInitScript((names: string[]) => {
		window.__APP_ENV__ = {
			...(window.__APP_ENV__ ?? {}),
			...Object.fromEntries(names.map((name) => [name, "true"])),
		} as Window["__APP_ENV__"];
	}, flags);
}
