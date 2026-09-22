import { isAgencyScopedRequestsEnabled } from "@helpers/featureFlags";

/**
 * How to ask dcb-service for "the requests my library borrowed".
 *
 * `patronAgencyCode` is the correct question; `patronHostlmsCode` returns every
 * co-tenant's requests on a shared system. It is flagged because the field does
 * not exist before 9.0.0, where an unknown filter name EMPTIES the grid rather
 * than widening it. docs/insights.md.
 */
export const borrowedByLibraryQuery = (
	agencyCode: string | undefined,
	hostLmsCode: string | undefined,
): string =>
	isAgencyScopedRequestsEnabled()
		? `patronAgencyCode:${String(agencyCode)}`
		: `patronHostlmsCode:${String(hostLmsCode)}`;

/**
 * Whether the code that scopes those views is present yet.
 *
 * The two views gate their query on having something to scope by, and which value that is
 * depends on the same flag. Asking here keeps the flag read in one place rather than at
 * each `enabled:`.
 */
export const hasBorrowingScope = (
	agencyCode: string | undefined,
	hostLmsCode: string | undefined,
): boolean =>
	isAgencyScopedRequestsEnabled() ? !!agencyCode : !!hostLmsCode;
