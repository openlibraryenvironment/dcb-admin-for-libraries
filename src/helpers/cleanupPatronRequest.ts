import axios from "axios";
import { authHeaders } from "@helpers/auth";
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
	patronHostlmsCode?: string | null;
	requestingIdentity?: { resolvedAgency?: { code?: string | null } | null } | null;
	suppliers?: { localAgency?: string | null; isActive?: boolean | null }[] | null;
}

/** Who is asking, as the request grids scope "my library". */
export interface CleanupCaller {
	agencyCodes: readonly string[];
	/** The caller's Host LMS, which names the borrowing library where agency scoping is off. */
	hostLmsCode?: string;
	/** VITE_FEATURE_AGENCY_SCOPED_REQUESTS: the request records its borrowing agency. */
	agencyScoped: boolean;
	/** VITE_FEATURE_GUARDED_CLEANUP: dcb-service refuses an item-out cleanup, overridably. */
	guarded: boolean;
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

/** Whether the caller's library borrowed this request, by the same rule as borrowedByLibraryQuery. */
export const isBorrowedByCaller = (
	request: CleanableRequest | undefined,
	{ agencyCodes, hostLmsCode, agencyScoped }: Omit<CleanupCaller, "guarded">,
): boolean => {
	if (agencyScoped) {
		const code = request?.requestingIdentity?.resolvedAgency?.code;
		return !!code && agencyCodes.includes(code);
	}

	return !!hostLmsCode && request?.patronHostlmsCode === hostLmsCode;
};

/**
 * Whether to offer cleanup for this request: to the borrowing library or a supplying one, the
 * borrower by agency where the request records it, otherwise by Host LMS, which on a shared
 * system is every co-tenant. docs/cleanup.md.
 *
 * Guarded, the server refuses an item-out request and the caller may override, so only the
 * terminal states are filtered. Unguarded (8.71.0) there is no refusal, so the status list
 * is the only gate and an item that has left the library is never offered.
 */
export const isCleanupEligible = (
	request: CleanableRequest | undefined,
	caller: CleanupCaller,
): boolean => {
	const status = request?.status;

	if (!status) return false;
	if (
		!isSuppliedByCaller(request, caller.agencyCodes) &&
		!isBorrowedByCaller(request, caller)
	) {
		return false;
	}

	return caller.guarded
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
 * poll is not worth a round trip. An override follows a refusal that has just refreshed the
 * request, so it does not poll the library systems twice.
 */
export const cleanupPatronRequest = async (
	apiBase: string,
	request: CleanableRequest | undefined,
	{
		refreshFirst = false,
		override = false,
	}: { refreshFirst?: boolean; override?: boolean } = {},
): Promise<CleanupOutcome> => {
	const base = `${apiBase}/patrons/requests/${request?.id}`;

	try {
		if (
			refreshFirst &&
			!override &&
			!untrackedStatuses.includes(String(request?.status))
		) {
			await axios.post(`${base}/update`, {}, { headers: await authHeaders() });
		}

		await axios.post(`${base}/transition/cleanup`, {}, {
			headers: await authHeaders(),
			...(override ? { params: { force: true } } : {}),
		});

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
