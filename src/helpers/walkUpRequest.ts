import { getRequestError } from "@helpers/getRequestError";

/**
 * dcb-service's WalkUpRequestCommand. 8.71.0 to 9.1.0 require every field; dcb-service main
 * drops patronBarcode, and an unknown field is ignored there, so it is sent to both.
 */
export interface WalkUpRequestPayload {
	itemHostLmsCode: string;
	itemAgencyCode: string;
	itemBarcode: string;
	pickupLocationCode: string;
	patronBarcode: string;
	patronLocalId: string;
	patronAgencyCode: string;
	patronHostLmsCode: string;
}

export function buildWalkUpPayload(input: {
	staffHostLmsCode: string;
	staffAgencyCode: string;
	itemBarcode: string;
	pickupLocationCode: string;
	patronBarcode: string;
	patronLocalId: string;
	patronAgencyCode: string;
	patronHostLmsCode: string;
}): WalkUpRequestPayload {
	return {
		itemHostLmsCode: input.staffHostLmsCode,
		itemAgencyCode: input.staffAgencyCode,
		itemBarcode: input.itemBarcode,
		pickupLocationCode: input.pickupLocationCode,
		patronBarcode: input.patronBarcode,
		patronLocalId: input.patronLocalId,
		patronAgencyCode: input.patronAgencyCode,
		patronHostLmsCode: input.patronHostLmsCode,
	};
}

// No release up to 9.1.0 sends these but DUPLICATE_REQUEST_ATTEMPT; there, getRequestError answers
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
	"SUPPLIER_CANNOT_SUPPLY",
] as const;

type Translate = Parameters<typeof getRequestError>[1];

/** Why dcb-service refused a walk-up, in words the desk can act on. */
export function walkUpRefusal(
	status: number | undefined,
	failedChecks: { code?: string; description?: string }[] | undefined,
	t: Translate,
): string {
	if (status === 403) {
		return t("requesting.quick_walk_up.errors.forbidden");
	}

	const first = failedChecks?.[0];
	const code = first?.code;

	return code && (WALK_UP_REFUSALS as readonly string[]).includes(code)
		? t(`requesting.quick_walk_up.errors.${code.toLowerCase()}`, {
				description: first.description ?? "",
			})
		: getRequestError(failedChecks, t);
}
