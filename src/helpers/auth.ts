import {
	UserManager,
	type UserManagerEvents,
	type UserManagerSettings,
} from "oidc-client-ts";
import type { QueryClient } from "@tanstack/react-query";

/** Where the access token lives, and why nothing else holds it: docs/auth.md. */
let userManager: UserManager | undefined;

export function createUserManager(settings: UserManagerSettings): UserManager {
	userManager = new UserManager(settings);
	return userManager;
}

/** Awaited inside each request, never captured: silent renewal replaces the token. */
export async function authHeaders(): Promise<{ Authorization: string }> {
	const token = (await userManager?.getUser())?.access_token;
	if (!token) throw new Error("No signed-in user to authorise this request");
	return { Authorization: `Bearer ${token}` };
}

/** A renewal keeps the cache; only the user going away clears it. */
export function clearCacheOnSignOut(
	events: UserManagerEvents,
	queryClient: Pick<QueryClient, "clear">,
): () => void {
	const clear = () => queryClient.clear();
	const stopUnloaded = events.addUserUnloaded(clear);
	const stopSignedOut = events.addUserSignedOut(clear);
	return () => {
		stopUnloaded();
		stopSignedOut();
	};
}
