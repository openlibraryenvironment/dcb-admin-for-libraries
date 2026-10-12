import { isAgencyScopedRequestsEnabled } from "@helpers/featureFlags";
import { isUuidShaped } from "@helpers/isUuidShaped";

/**
 * Which requests an export may contain, enforced in the query and again on every row.
 * What each condition covers on each dcb-service release: docs/export.md.
 */

export class ExportScopeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ExportScopeError";
	}
}

export interface ExportGuard {
	/** From the signed-in user's claim, never from anything the user typed or chose. */
	agencyCodes: readonly string[];
	/** Every location belonging to those agencies. */
	pickupLocationIds: readonly string[];
	/** Whether this dcb-service can filter on, and return, the patron's agency. */
	patronAgency: boolean;
}

/**
 * One query term per location goes into every export request. A library has tens of
 * locations; more than this is refused rather than sent, because leaving locations out
 * would silently drop requests and adding them unbounded would not be a bound.
 */
export const MAX_GUARD_LOCATIONS = 1000;

export const exportGuard = (
	agencyCodes: readonly string[],
	pickupLocationIds: readonly string[],
): ExportGuard => {
	const codes = agencyCodes.map((code) => code.trim()).filter(Boolean);
	if (codes.length === 0) {
		throw new ExportScopeError("No library to scope the export to");
	}
	if (pickupLocationIds.length > MAX_GUARD_LOCATIONS) {
		throw new ExportScopeError("Too many locations to scope the export by");
	}
	return {
		agencyCodes: codes,
		pickupLocationIds: pickupLocationIds.filter(isUuidShaped),
		patronAgency: isAgencyScopedRequestsEnabled(),
	};
};

// Quoted, so no character in a value can end the term: inside quotes only `"` and `\` mean anything.
const quoted = (value: string): string => `"${value.replace(/["\\]/g, "\\$&")}"`;

// Explicit ORs throughout: dcb-service silently drops a clause joined by an implicit operator.
const anyOf = (field: string, values: readonly string[]): string[] =>
	values.map((value) => `${field}:${quoted(value)}`);

export const guardQuery = (guard: ExportGuard): string =>
	[
		...(guard.patronAgency ? anyOf("patronAgencyCode", guard.agencyCodes) : []),
		...anyOf("supplyingAgencyCode", guard.agencyCodes),
		...anyOf("pickupLocationCode", guard.pickupLocationIds),
	].join(" OR ");

/** Parenthesised on both sides: dcb-service flattens an ungrouped `a AND b OR c` into `a OR b OR c`. */
export const guardedQuery = (guard: ExportGuard, gridQuery: string): string =>
	gridQuery.trim()
		? `(${guardQuery(guard)}) AND (${gridQuery})`
		: `(${guardQuery(guard)})`;

/** Records by id; anything not shaped like one is dropped, and an empty list is refused rather than read as "all". */
export const idsQuery = (ids: readonly unknown[]): string => {
	const valid = ids.map(String).filter(isUuidShaped);
	if (valid.length === 0) {
		throw new ExportScopeError("No record id to ask for");
	}
	return anyOf("id", valid).join(" OR ");
};

/** The `agencies` query for the user's own agencies, whose locations are the pickup condition. */
export const agencyLocationsQuery = (agencyCodes: readonly string[]): string =>
	anyOf("code", agencyCodes).join(" OR ");

export interface ScopedRequestFields {
	pickupLocationCode?: string | null;
	requestingIdentity?: { resolvedAgency?: { code?: string | null } | null } | null;
	suppliers?: ({ localAgency?: string | null } | null)[] | null;
}

/** Whether the row's own fields prove one of the user's libraries is party to it. */
export const isRequestInExportScope = (
	request: ScopedRequestFields | null | undefined,
	guard: ExportGuard,
): boolean => {
	if (!request) return false;
	const ours = (code: string | null | undefined): boolean =>
		!!code && guard.agencyCodes.includes(code);

	const borrowed =
		guard.patronAgency && ours(request.requestingIdentity?.resolvedAgency?.code);
	const supplied = (request.suppliers ?? []).some((supplier) =>
		ours(supplier?.localAgency),
	);
	const pickup =
		!!request.pickupLocationCode &&
		guard.pickupLocationIds.includes(request.pickupLocationCode);

	return borrowed || supplied || pickup;
};
