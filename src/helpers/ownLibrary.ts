import request from "graphql-request";
import { getLibraryBasics } from "@queries/getLibraryBasics";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";

// The signed-in user's own library. Every insights query is scoped by a Host LMS
// code derived from the agency claim on the access token - the header picker only
// chooses among the libraries that claim names - never from anything the user can
// type. Keep it that way: a libraryCode taken from the URL or a form would let a
// library admin read another library's figures for as long as dcb-service trusts
// the query param.

export interface OwnLibrary {
	id: string;
	fullName: string;
	shortName: string;
	agencyCode: string;
	agency?: {
		code?: string;
		hostLms?: { code?: string };
	};
}

interface LibrariesResponse {
	libraries?: { content?: OwnLibrary[] };
}

/** Shared by the insights route loader and the components, so prefetch and read share a key. */
export function ownLibraryQueryOptions(
	cfg: { VITE_DCB_API_BASE?: string },
	agencyCode: string,
) {
	const apiBase = cfg?.VITE_DCB_API_BASE ?? "";
	return {
		queryKey: queryKeys.library.own(apiBase, agencyCode),
		queryFn: async (): Promise<LibrariesResponse> =>
			request(
				apiBase + "/graphql",
				getLibraryBasics,
				{ query: "agencyCode:" + agencyCode },
				await authHeaders(),
			),
		// The caller's own library record changes at the pace of onboarding, not of
		// browsing. Five minutes keeps every insights panel off the network for a
		// whole session's worth of range changes without going stale in practice.
		staleTime: 5 * 60 * 1000,
	};
}

// Insights filter on a Host LMS code (patron_hostlms_code / local_item_hostlms_code),
// which for a library is Library.agency.hostLms.code.
export function hostLmsCodeOf(
	response: LibrariesResponse | undefined,
): string | undefined {
	return response?.libraries?.content?.[0]?.agency?.hostLms?.code;
}

export function libraryOf(
	response: LibrariesResponse | undefined,
): OwnLibrary | undefined {
	return response?.libraries?.content?.[0];
}
