import type { Page } from "@playwright/test";
import { KEYCLOAK_ID, KEYCLOAK_URL } from "./runtime-config";

export const LIBRARY_ADMIN_ROLES = ["LIBRARY_ADMIN"];
export const READ_ONLY_ROLES = ["LIBRARY_READ_ONLY"];

/** The agency the seeded user belongs to; fixture data is keyed to it. */
export const AGENCY_CODE = "e2e-agency";

export interface FakeUserOptions {
	roles?: string[];
	agencyCode?: string;
}

/**
 * oidc-client-ts stores the session in SESSION storage by default, and this app
 * passes no `userStore` override (unlike dcb-admin-ui, which opts into
 * localStorage). Seeding the wrong store silently produces a logged-out app, so
 * the store and the key format are both taken from the library:
 * WebStorageStateStore's default "oidc." prefix plus UserManager's
 * `user:{authority}:{client_id}`.
 */
export function getAuthStorageKey(): string {
	return `oidc.user:${KEYCLOAK_URL}:${KEYCLOAK_ID}`;
}

/**
 * Matches User.toStorageString() - the app never verifies this against a real
 * Keycloak, it deserialises whatever the store hands back. `profile.code` is
 * the agency code every authenticated page keys its queries on.
 */
function buildFakeUser({
	roles = LIBRARY_ADMIN_ROLES,
	agencyCode = AGENCY_CODE,
}: FakeUserOptions = {}) {
	return {
		id_token: "e2e-fake-id-token",
		session_state: "e2e-fake-session-state",
		access_token: "e2e-fake-access-token",
		refresh_token: undefined,
		token_type: "Bearer",
		scope: "openid profile email",
		profile: {
			sub: "e2e-test-user",
			email: "e2e-test-user@example.invalid",
			preferred_username: "e2e-test-user",
			code: agencyCode,
			roles,
		},
		// Far enough out that automaticSilentRenew's timer, which is scheduled
		// relative to expires_at, never fires mid-run against a host that does
		// not resolve.
		expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
	};
}

// Records that the one-time seed already ran. Not namespaced and not the OIDC
// key itself, so it survives both the app clearing its own storage and
// userManager.removeUser(). Without it, addInitScript - which re-runs on EVERY
// document load - would re-seed the session on the reload that logout performs,
// resurrecting a session the app just ended and masking real logout bugs.
const SEED_SENTINEL_KEY = "__e2e_auth_seeded__";

/**
 * Start the test already signed in. Call before page.goto; omit it entirely to
 * exercise the unauthenticated path. Must run before any app script, so
 * react-oidc-context's first getUser() already finds a session.
 */
export async function seedAuth(
	page: Page,
	options?: FakeUserOptions,
): Promise<void> {
	await page.addInitScript(
		([storageKey, storageValue, sentinelKey]) => {
			if (window.sessionStorage.getItem(sentinelKey)) return;
			window.sessionStorage.setItem(storageKey, storageValue);
			window.sessionStorage.setItem(sentinelKey, "1");
		},
		[
			getAuthStorageKey(),
			JSON.stringify(buildFakeUser(options)),
			SEED_SENTINEL_KEY,
		] as const,
	);
}
