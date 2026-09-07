import { isAgencyScopedRequestsEnabled } from "@helpers/featureFlags";

/**
 * How to ask dcb-service for "the requests my library borrowed".
 *
 * `patronAgencyCode` is the correct question and `patronHostlmsCode` is not. A patron
 * request records the Host LMS its patron came from but not their library, so on a shared
 * system - sixty libraries on one Koha - filtering by Host LMS returns every co-tenant's
 * requests rather than your own.
 *
 * It is behind a flag because the field does not exist before dcb-service 9.0.0. There the
 * Lucene query builder resolves a filter name against the entity's properties and raises
 * on one it does not recognise, so sending `patronAgencyCode` to an older backend does not
 * fall back to something broader - it fails the query outright and empties the grid.
 *
 * Both forms are wrong on a shared system running an older backend. The flag chooses
 * between "shows too much" and "shows nothing", and only the newer backend can be correct,
 * which is the point of turning it on.
 *
 * This is a Lucene filter string rather than a GraphQL selection, which is why it lives
 * here and not in the capability registry's `fields` - but it moves with the same flag,
 * because the same dcb-service release is what makes both halves answerable.
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
