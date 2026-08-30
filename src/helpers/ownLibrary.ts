import request from "graphql-request";
import { getLibraryBasics } from "@queries/getLibraryBasics";

// The signed-in user's own library. Every insights query is scoped by a Host LMS
// code, and this app has no library picker: the code is derived from the agency
// claim on the access token, never from anything the user can type. Keep it that
// way - a libraryCode taken from the URL or a form would let a library admin read
// another library's figures for as long as dcb-service trusts the query param.

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

// A typed key factory rather than inline literals, so the route loader's prefetch
// and the component's useQuery can never drift apart and invalidation keeps matching.
// The API base is part of the identity of the record; the bearer token deliberately
// is not - see the disable comment on the query options below.
export const ownLibraryQueryKey = (apiBase: string, agencyCode: string) =>
	["ownLibrary", apiBase, agencyCode] as const;

interface LibrariesResponse {
	libraries?: { content?: OwnLibrary[] };
}

export function ownLibraryQueryOptions(
	cfg: { VITE_DCB_API_BASE?: string },
	// Structurally typed rather than importing AuthContextProps: this is called
	// from a route loader with the raw router context as well as from a component
	// with react-oidc-context's own shape.
	auth: { user?: { access_token?: string } | null },
	agencyCode: string,
) {
	// The bearer token is intentionally absent from the query key.
	// automaticSilentRenew rotates it every few minutes; keying on it would evict
	// this entry and refetch the library record on every renew, for every mounted
	// panel, to return byte-identical data. The record's identity is the backend
	// plus the agency, which is what the key carries.
	// eslint-disable-next-line @tanstack/query/exhaustive-deps
	return {
		queryKey: ownLibraryQueryKey(cfg?.VITE_DCB_API_BASE ?? "", agencyCode),
		queryFn: async (): Promise<LibrariesResponse> =>
			request(
				cfg?.VITE_DCB_API_BASE + "/graphql",
				getLibraryBasics,
				{ query: "agencyCode:" + agencyCode },
				{ Authorization: `Bearer ${auth?.user?.access_token}` },
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
