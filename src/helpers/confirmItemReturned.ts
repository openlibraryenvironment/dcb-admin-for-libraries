import axios from "axios";
import { authHeaders } from "@helpers/auth";

/**
 * DCB is waiting only for the supplying library to report the item back: cancelled after it
 * shipped, or returned after a loan.
 */
export const confirmReturnStatuses = [
	"AWAITING_RETURN_TO_SUPPLIER",
	"RETURN_TRANSIT",
];

export interface ConfirmableRequest {
	id?: string;
	status?: string;
	suppliers?: { localAgency?: string | null; isActive?: boolean | null }[] | null;
}

/**
 * Offered to the library holding the ACTIVE supplier request: the one whose shelf the item
 * returns to. An earlier supplier never had this copy. The server checks the same.
 */
export const isConfirmReturnEligible = (
	request: ConfirmableRequest | undefined,
	agencyCodes: readonly string[],
): boolean =>
	!!request?.status &&
	confirmReturnStatuses.includes(request.status) &&
	(request.suppliers ?? []).some(
		(supplier) =>
			supplier?.isActive !== false &&
			!!supplier?.localAgency &&
			agencyCodes.includes(supplier.localAgency),
	);

export type ConfirmReturnOutcome =
	| { kind: "confirmed" }
	| { kind: "refused"; detail?: string }
	| { kind: "forbidden" }
	| { kind: "failed" };

export const confirmItemReturned = async (
	apiBase: string,
	patronRequestId: string | undefined,
): Promise<ConfirmReturnOutcome> => {
	try {
		await axios.post(
			`${apiBase}/patrons/requests/${patronRequestId}/transition/confirm-returned`,
			{},
			{ headers: await authHeaders() },
		);

		return { kind: "confirmed" };
	} catch (error) {
		if (!axios.isAxiosError(error)) return { kind: "failed" };

		const body = error.response?.data as { detail?: string } | undefined;

		switch (error.response?.status) {
			case 409:
				return { kind: "refused", detail: body?.detail };
			// A library is told 403 for a request that is not its own and for one that does not exist
			case 403:
			case 404:
				return { kind: "forbidden" };
			default:
				return { kind: "failed" };
		}
	}
};
