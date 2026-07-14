/**
 * Base-path awareness for deployments that mount several OpenRS apps at path
 * prefixes on ONE origin (mobius.kihosting.net/dcb-admin,
 * mobius.kihosting.net/dcb-admin-for-libraries, ...).
 *
 * BASE is baked in at build time by Vite (`base` in vite.config.ts, fed from
 * VITE_PUBLIC_URL). It is deliberately NOT runtime config: the asset base and
 * the router basepath must be the same value, and only the build can know the
 * asset base. Supplying it a second time via inject_env.json lets the two drift
 * apart, which mounts the router at a path its own assets do not resolve from.
 */

// Vite normalises this to always carry a trailing slash: "/" or
// "/dcb-admin-for-libraries/".
export const BASE = import.meta.env.BASE_URL;

/**
 * Identifies this app within the storage shared by every app on the origin.
 * "/dcb-admin-for-libraries/" -> "dcb-admin-for-libraries"; "/" -> "root".
 */
export const APP_NAMESPACE = BASE.replace(/^\/|\/$/g, "") || "root";

/**
 * Namespaces a persisted-store key. Sibling apps on the same origin share one
 * localStorage and one sessionStorage, so a bare key like "grid-storage"
 * collides: last writer wins, and hydrating a sibling's differently-shaped
 * state can throw during render.
 */
export const storageKey = (name: string) => `${APP_NAMESPACE}:${name}`;

/**
 * Absolute URL to a path inside this app - for anything handed to an external
 * system (OIDC redirect_uri, post_logout_redirect_uri). window.location.origin
 * alone points at the bare host, which serves no app when several are mounted
 * under prefixes.
 */
export const appUrl = (path = ""): string =>
	`${window.location.origin}${BASE}${path.replace(/^\//, "")}`;

/**
 * Browser-absolute path, no origin - for window.location.href/replace, and for
 * public/ assets referenced from TSX, which Vite does NOT rewrite for the base
 * (it only rewrites them in index.html).
 */
export const appPath = (path = ""): string =>
	`${BASE}${path.replace(/^\//, "")}`;

/**
 * Strips the base off a browser pathname to give a router path. TanStack Router
 * works in basepath-relative paths, but window.location.pathname includes the
 * base, so the two must never be compared or interchanged raw.
 */
export const toRoutePath = (
	pathname: string = window.location.pathname,
): string => {
	const prefix = BASE.slice(0, -1); // "" when BASE is "/"
	return pathname.startsWith(prefix)
		? pathname.slice(prefix.length) || "/"
		: pathname;
};
