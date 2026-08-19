import type { Page } from "@playwright/test";

/**
 * The app reads its configuration at RUNTIME, not from the bundle: main.tsx
 * calls getStandaloneConfig(), which returns window.__APP_ENV__ if it is
 * present and only falls back to fetching inject_env.json. Tests therefore
 * inject the whole config rather than baking a second .env into a second
 * build - one production build serves every spec.
 *
 * None of these hosts resolve. That is deliberate: any request the specs have
 * not mocked fails loudly instead of reaching a real service.
 */
export const KEYCLOAK_URL = "https://e2e-fake-keycloak.invalid/realms/dcb";
export const KEYCLOAK_ID = "dcb-admin-for-libraries-e2e";
export const API_BASE = "https://e2e-fake-api.invalid";

export const RUNTIME_CONFIG = {
	VITE_KEYCLOAK_URL: KEYCLOAK_URL,
	VITE_KEYCLOAK_ID: KEYCLOAK_ID,
	VITE_DCB_API_BASE: API_BASE,
	VITE_DCB_SEARCH_BASE: API_BASE,
	// Deliberately empty. A licence key is a secret that CI does not hold, and a
	// suite whose result depends on whether one happens to be present locally is
	// not a gate. MUI X renders its watermark instead; see accessibility.spec.ts.
	VITE_MUI_X_LICENSE_KEY: "",
} as const;

export async function injectRuntimeConfig(page: Page): Promise<void> {
	await page.addInitScript((config) => {
		window.__APP_ENV__ = config;
	}, RUNTIME_CONFIG as Record<string, string>);
}
