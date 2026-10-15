/** Where a read-only user is sent, and the branch of the app they work in. */
export const READ_ONLY_HOME = "/requesting";

// A user's own display preferences and the accessibility statement, which change nothing anyone else sees
const READ_ONLY_ALSO = ["/preferences", "/accessibility", "/logout"] as const;

const ADMIN_ROLE = "LIBRARY_ADMIN";
const READ_ONLY_ROLE = "LIBRARY_READ_ONLY";

/** Deny by default: full access is LIBRARY_ADMIN's alone, and read-only wins over it. */
export const isReadOnly = (roles: readonly string[] | undefined): boolean =>
	!(roles ?? []).includes(ADMIN_ROLE) || (roles ?? []).includes(READ_ONLY_ROLE);

/**
 * The previous predicate matched "/requesting/" WITH a trailing slash, so
 * /requesting itself failed it and the guard bounced a read-only user off the
 * one page it had just sent them to. From an effect that settles; thrown from
 * beforeLoad it is an infinite redirect.
 *
 * Paths are router-relative: the base prefix is not part of them.
 */
export const isReadOnlyAllowed = (pathname: string): boolean =>
	[READ_ONLY_HOME, ...READ_ONLY_ALSO].some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);
