/**
 * Picks the navigation tab that owns a router pathname.
 *
 * The pathnames handed in here are ROUTER paths, never browser paths. TanStack
 * Router strips the basepath on the way in (`useLocation().pathname` is
 * "/requesting", not "/dcb-admin-for-libraries/requesting") and adds it back on
 * the way out when it renders a `to`. Feeding a base-prefixed value to either
 * side double-counts the base, which is a "Not Found" on navigation and a dead
 * indicator on selection. See `appBase.ts` for the browser-path side.
 */

const trimTrailingSlash = (path: string): string =>
	path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

/**
 * A tab owns a path when it is that path or an ancestor segment of it.
 * Segment-wise, not `startsWith` on the raw string: "/locations" must not claim
 * "/locationsArchive". "/" owns only itself, so an unrecognised route leaves
 * every tab unselected rather than silently lighting up home.
 */
const owns = (tabValue: string, pathname: string): boolean => {
	if (tabValue === "/") {
		return pathname === "/";
	}
	return pathname === tabValue || pathname.startsWith(`${tabValue}/`);
};

export const matchActiveTab = (
	pathname: string,
	tabValues: readonly string[],
): string | false => {
	const path = trimTrailingSlash(pathname);
	let best: string | false = false;
	for (const tabValue of tabValues) {
		if (owns(trimTrailingSlash(tabValue), path)) {
			if (best === false || tabValue.length > best.length) {
				best = tabValue;
			}
		}
	}
	return best;
};
