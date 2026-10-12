import { availabilityQueryOptions } from "@helpers/availabilityApi";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "react-oidc-context";
import { useRouter } from "@tanstack/react-router";
import { ClusterDetailResponse } from "@models/ClusterDetailResponse";
import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";

// Gets the stuff we need on the various cluster record / items pages to make them cleaner
// Choose which mode you need
export type ClusterRecordMode = "info" | "items" | "all";

interface UseClusterRecordOptions {
	mode?: ClusterRecordMode;
}

export const useClusterDetail = (
	recordId: string,
	{ mode = "all" }: UseClusterRecordOptions = {},
) => {
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: any };

	const apiBase = cfg?.VITE_DCB_API_BASE;
	const searchBase = cfg?.VITE_DCB_SEARCH_BASE;

	const shouldFetchInfo = mode === "info" || mode === "all";
	const shouldFetchItems = mode === "items" || mode === "all";

	const detailQuery = useQuery<ClusterDetailResponse>({
		queryKey: queryKeys.search.clusterDetail(searchBase, recordId),
		queryFn: async () => {
			const { data } = await axios.get(
				`${searchBase}/public/opac-inventory/instances/${recordId}`,
				{ headers: await authHeaders() },
			);
			return data;
		},
		enabled:
			shouldFetchInfo && auth.isAuthenticated && !!searchBase && !!recordId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const itemsEnabled = shouldFetchItems && !!apiBase && !!recordId;

	const unfilteredQuery = useQuery({
		...availabilityQueryOptions(apiBase, recordId, "none"),
		enabled: itemsEnabled,
	});
	// The filtered list can only be a subset, so it is asked for only when the
	// unfiltered one has anything in it.
	const hasAnyItems = (unfilteredQuery.data?.itemList?.length ?? 0) > 0;
	const shownQuery = useQuery({
		...availabilityQueryOptions(apiBase, recordId),
		enabled: itemsEnabled && hasAnyItems,
	});
	const shownItems = hasAnyItems ? shownQuery.data?.itemList : undefined;
	// The search card shares this entry, so it can hold an error this page never asked for.
	const shownError = hasAnyItems ? shownQuery.error : null;

	const itemsNotShown = useMemo(() => {
		const shownIds = new Set((shownItems ?? []).map((i) => i.id));
		return (unfilteredQuery.data?.itemList ?? []).filter(
			(i) => !shownIds.has(i.id),
		);
	}, [unfilteredQuery.data, shownItems]);

	return {
		// Data Access
		clusterDetail: detailQuery.data,
		items: shownItems ?? [],
		itemsNotShown,

		// Useful indicators
		totalItemsCount: unfilteredQuery.data?.itemList?.length ?? 0,
		responseErrors: unfilteredQuery.data?.errors || [],

		// Statuses
		isLoading:
			(shouldFetchInfo && detailQuery.isLoading) ||
			(shouldFetchItems && (unfilteredQuery.isLoading || shownQuery.isLoading)),
		isError: detailQuery.isError || unfilteredQuery.isError || !!shownError,
		error: detailQuery.error || unfilteredQuery.error || shownError,
	};
};
