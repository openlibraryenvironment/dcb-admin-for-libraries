import { toRoutePath } from "@helpers/appBase";
import { isReadOnlyAllowed } from "@helpers/readOnlyAccess";

/**
 * The address to come back to after signing in, if it is one of this app's own pages.
 * It is read from sessionStorage, which any script on this origin can write - and the
 * origin is shared with other apps - so it is checked as if it came from outside.
 */
export function safeReturnPath(
	path: string | null,
	base: string,
	origin: string = window.location.origin,
): string | null {
	if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
		return null;
	}
	const url = new URL(path, origin);
	if (url.origin !== origin || !url.pathname.startsWith(base)) return null;
	return url.pathname + url.search + url.hash;
}

/**
 * Where to send a user once they are signed in again: back where they were, unless they
 * are read-only and that is a page they may not open. Null means nowhere in particular.
 */
export const signInReturnPath = (returnTo: string | null, readOnly: boolean): string | null => {
	if (!returnTo || !readOnly) return returnTo;
	const { pathname } = new URL(returnTo, "https://return.invalid");
	return isReadOnlyAllowed(toRoutePath(pathname)) ? returnTo : null;
};
