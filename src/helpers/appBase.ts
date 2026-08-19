/**
 * Base-path awareness for deployments that mount several OpenRS apps at path
 * prefixes on ONE origin (mobius.kihosting.net/dcb-admin,
 * mobius.kihosting.net/dcb-admin-for-libraries, ...).
 *
 * Standalone startup uses Vite's asset base. KI bootloader startup uses "/"
 * because its assets resolve relative to ki-bootstrap.js independently. The
 * base is therefore runtime state, set once at startup before the app mounts.
 */

const normaliseBase = (base: string): string => {
	const path = base.replace(/^\/+|\/+$/g, "");
	return path ? `/${path}/` : "/";
};

let appBase = normaliseBase(import.meta.env.BASE_URL);

export const configureAppBase = (base: string): void => {
	appBase = normaliseBase(base);
};

export const getAppBase = (): string => appBase;

/**
 * Identifies this app within the storage shared by every app on the origin.
 * "/dcb-admin-for-libraries/" -> "dcb-admin-for-libraries"; "/" -> "root".
 */
export const getAppNamespace = (): string =>
	appBase.replace(/^\/|\/$/g, "") || "root";

/**
 * Namespaces a persisted-store key. Sibling apps on the same origin share one
 * localStorage and one sessionStorage, so a bare key like "grid-storage"
 * collides: last writer wins, and hydrating a sibling's differently-shaped
 * state can throw during render.
 */
export const storageKey = (name: string) => `${getAppNamespace()}:${name}`;

/**
 * Absolute URL to a path inside this app - for anything handed to an external
 * system (OIDC redirect_uri, post_logout_redirect_uri). window.location.origin
 * alone points at the bare host, which serves no app when several are mounted
 * under prefixes.
 */
export const appUrl = (path = ""): string =>
	`${window.location.origin}${appBase}${path.replace(/^\//, "")}`;

/**
 * Browser-absolute path, no origin - for window.location.href/replace, and for
 * public/ assets referenced from TSX, which Vite does NOT rewrite for the base
 * (it only rewrites them in index.html).
 */
export const appPath = (path = ""): string =>
	`${appBase}${path.replace(/^\//, "")}`;

export const assetUrl = (path = ""): string => {
	const base =
		typeof window === "undefined"
			? import.meta.env.BASE_URL
			: (window.__DCB_BUNDLE_BASE_URL__ ?? appBase);
	return new URL(path.replace(/^\//, ""), window.location.origin + base).href;
};

/**
 * Strips the base off a browser pathname to give a router path. TanStack Router
 * works in basepath-relative paths, but window.location.pathname includes the
 * base, so the two must never be compared or interchanged raw.
 */
export const toRoutePath = (
	pathname: string = window.location.pathname,
): string => {
	const prefix = appBase.slice(0, -1); // "" when base is "/"
	return pathname.startsWith(prefix)
		? pathname.slice(prefix.length) || "/"
		: pathname;
};
