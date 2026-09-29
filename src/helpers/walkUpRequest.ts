import type { QueryKey } from "@tanstack/react-query";

/** Exactly the fields dcb-service's WalkUpRequestCommand declares, all required. */
export interface WalkUpRequestPayload {
	itemHostLmsCode: string;
	itemAgencyCode: string;
	itemBarcode: string;
	pickupLocationCode: string;
	patronLocalId: string;
	patronAgencyCode: string;
	patronHostLmsCode: string;
}

export function buildWalkUpPayload(input: {
	staffHostLmsCode: string;
	staffAgencyCode: string;
	itemBarcode: string;
	pickupLocationCode: string;
	patronLocalId: string;
	patronAgencyCode: string;
	patronHostLmsCode: string;
}): WalkUpRequestPayload {
	return {
		itemHostLmsCode: input.staffHostLmsCode,
		itemAgencyCode: input.staffAgencyCode,
		itemBarcode: input.itemBarcode,
		pickupLocationCode: input.pickupLocationCode,
		patronLocalId: input.patronLocalId,
		patronAgencyCode: input.patronAgencyCode,
		patronHostLmsCode: input.patronHostLmsCode,
	};
}

const WALK_UP_REFUSALS = [
	"WALK_UP_SAME_LIBRARY",
	"WALK_UP_ITEM_AGENCY_MISMATCH",
	"WALK_UP_PICKUP_ELSEWHERE",
	"WALK_UP_ITEM_ALREADY_REQUESTED",
	"ITEM_NOT_FOUND",
	"ITEM_NOT_AVAILABLE",
	"ITEM_NOT_IN_SHARED_INDEX",
	"CLUSTER_DELETED",
	"DUPLICATE_REQUEST_ATTEMPT",
	"REQUEST_LIMITS_UNCHECKED",
] as const;

/** The translation key for why dcb-service refused a walk-up. */
export function walkUpRefusalKey(
	status: number | undefined,
	failedChecks: { code?: string }[] | undefined,
): string {
	if (status === 403) {
		return "requesting.quick_walk_up.errors.forbidden";
	}

	const code = failedChecks?.[0]?.code;

	return code && (WALK_UP_REFUSALS as readonly string[]).includes(code)
		? `requesting.quick_walk_up.errors.${code.toLowerCase()}`
		: "requesting.staff_request.patron.error.request.generic";
}

// The bearer token stays out of every key: in a key, each token refresh emptied the cache
export const walkUpKeys = {
	libraries: (apiBase: string): QueryKey => ["walkUp", "libraries", apiBase],
	pickupLocations: (apiBase: string, query: string): QueryKey => [
		"walkUp",
		"pickupLocations",
		apiBase,
		query,
	],
	request: (apiBase: string, id: string | null): QueryKey => [
		"walkUp",
		"request",
		apiBase,
		id,
	],
	availability: (apiBase: string, clusterId: string | null): QueryKey => [
		"walkUp",
		"availability",
		apiBase,
		clusterId,
	],
};
