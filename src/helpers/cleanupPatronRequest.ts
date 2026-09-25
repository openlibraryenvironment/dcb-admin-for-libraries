import axios from "axios";
import { cleanupStatuses } from "@constants/statuses/cleanupStatuses";
import { untrackedStatuses } from "@constants/statuses/untrackedStatuses";

/** Cleanup can never apply: the request is finished, or is not DCB's to finish. */
export const neverCleanableStatuses = [
	"COMPLETED",
	"FINALISED",
	"CANCELLED",
	"ARCHIVED",
	"HANDED_OFF_AS_LOCAL",
];

export interface CleanableRequest {
	id?: string;
	status?: string;
	suppliers?: { localAgency?: string | null; isActive?: boolean | null }[];
}

/** Whether one of the caller's agencies supplied this request. */
export const isSuppliedByCaller = (
	request: CleanableRequest | undefined,
	agencyCodes: readonly string[],
): boolean =>
	(request?.suppliers ?? []).some(
		(supplier) =>
			!!supplier?.localAgency && agencyCodes.includes(supplier.localAgency),
	);

/**
 * Whether to offer cleanup for this request.
 *
 * Cleanup belongs to the SUPPLYING library here: it deletes the borrowing library's
 * temporary records, and the supplying library is the one left with an item to account
 * for. Against dcb-service 9.0.0 and later the server refuses what is unsafe and this app
 * has no override, so eligibility is broad and the refusal is reported. Against 8.71.0
 * there is no refusal, so the status list is the only gate and an item that has left the
 * library is never offered.
 */
export const isCleanupEligible = (
	request: CleanableRequest | undefined,
	{
		guarded,
		agencyCodes,
	}: { guarded: boolean; agencyCodes: readonly string[] },
): boolean => {
	const status = request?.status;

	if (!status) return false;
	if (!isSuppliedByCaller(request, agencyCodes)) return false;

	return guarded
		? !neverCleanableStatuses.includes(status)
		: cleanupStatuses.includes(status);
};

export type CleanupOutcome =
	| { kind: "cleaned" }
	| { kind: "refused"; status?: string; detail?: string }
	| { kind: "forbidden" }
	| { kind: "notFound" }
	| { kind: "failed"; detail?: string };

/**
 * Check the request for updates, then clean it up.
 *
 * Refreshing first is the point of the guarded flow: a request can have moved on since the
 * grid was loaded, and the server guards on its stored state. A status dcb-service does not
 * poll is not worth a round trip.
 */
export const cleanupPatronRequest = async (
	apiBase: string,
	headers: Record<string, string>,
	request: CleanableRequest | undefined,
	{ refreshFirst = false }: { refreshFirst?: boolean } = {},
): Promise<CleanupOutcome> => {
	const base = `${apiBase}/patrons/requests/${request?.id}`;

	try {
		if (refreshFirst && !untrackedStatuses.includes(String(request?.status))) {
			await axios.post(`${base}/update`, {}, { headers });
		}

		await axios.post(`${base}/transition/cleanup`, {}, { headers });

		return { kind: "cleaned" };
	} catch (error) {
		if (!axios.isAxiosError(error)) return { kind: "failed" };

		const body = error.response?.data as
			| {
					detail?: string;
					patronRequestStatus?: string;
					lastKnownItemOutStatus?: string;
			  }
			| undefined;

		switch (error.response?.status) {
			case 409:
				return {
					kind: "refused",
					status: body?.lastKnownItemOutStatus ?? body?.patronRequestStatus,
					detail: body?.detail,
				};
			case 403:
				return { kind: "forbidden" };
			case 404:
				return { kind: "notFound" };
			default:
				return { kind: "failed", detail: body?.detail };
		}
	}
};
