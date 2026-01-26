import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "react-oidc-context";
import { useRouter } from "@tanstack/react-router";
import { ClusterDetailResponse } from "@models/ClusterDetailResponse";
import { ItemAvailabilityResponse } from "@models/ItemAvailabilityResponse";

// Gets the stuff we need on the various cluster record / items pages to make them cleaner
// Choose which mode you need
export type ClusterRecordMode = "info" | "items" | "all";

interface UseClusterRecordOptions {
	mode?: ClusterRecordMode;
}

interface CombinedItemsData {
	availability: ItemAvailabilityResponse;
	comparisonItems: ItemAvailabilityResponse;
}

export const useClusterDetail = (
	recordId: string,
	{ mode = "all" }: UseClusterRecordOptions = {},
) => {
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: any };

	const token = auth.user?.access_token;
	const apiBase = cfg?.VITE_DCB_API_BASE;
	const searchBase = cfg?.VITE_DCB_SEARCH_BASE;

	const shouldFetchInfo = mode === "info" || mode === "all";
	const shouldFetchItems = mode === "items" || mode === "all";

	const detailQuery = useQuery<ClusterDetailResponse>({
		queryKey: ["clusterDetail", recordId, searchBase, token],
		queryFn: async () => {
			const { data } = await axios.get(
				`${searchBase}/public/opac-inventory/instances/${recordId}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			return data;
		},
		enabled: shouldFetchInfo && !!token && !!searchBase && !!recordId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const fetchCombinedItems =
		useCallback(async (): Promise<CombinedItemsData> => {
			// We fetch this first to see if we even need to fetch the other one
			const { data: comparisonItems } = await axios.get(
				`${apiBase}/items/availability`,
				{
					headers: { Authorization: `Bearer ${token}` },
					params: { clusteredBibId: recordId, filters: "none" },
				},
			);

			let availability: ItemAvailabilityResponse;
			// If there are "items not shown", we need to then fetch the standard list to compare

			if (comparisonItems?.itemList && comparisonItems.itemList.length > 0) {
				const { data: liveData } = await axios.get(
					`${apiBase}/items/availability`,
					{
						headers: { Authorization: `Bearer ${token}` },
						params: { clusteredBibId: recordId },
					},
				);
				availability = liveData;
			} else {
				// If no items are returned in our "comparisonItems", proceed to return the response
				availability = {
					itemList: [],
					timings: comparisonItems?.timings ?? 0,
					bibClusterId: recordId,
					errors: comparisonItems?.errors || [],
				} as ItemAvailabilityResponse;
			}

			return { availability, comparisonItems };
		}, [apiBase, recordId, token]);

	const itemsQuery = useQuery<CombinedItemsData>({
		queryKey: ["combinedItems", recordId],
		queryFn: fetchCombinedItems,
		enabled: shouldFetchItems && !!token && !!apiBase && !!recordId,
		staleTime: 1000 * 60 * 5,
	});

	const itemsNotShown = useMemo(() => {
		if (!itemsQuery.data) return [];

		const { availability, comparisonItems } = itemsQuery.data;
		if (!availability?.itemList || !comparisonItems?.itemList) {
			return comparisonItems?.itemList ?? [];
		}

		const availabilityIds = new Set(availability.itemList.map((i) => i.id));
		return comparisonItems.itemList.filter((i) => !availabilityIds.has(i.id));
	}, [itemsQuery.data]);

	return {
		// Data Access
		clusterDetail: detailQuery.data,
		items: itemsQuery.data?.availability?.itemList ?? [],
		itemsNotShown,

		// Useful indicators
		totalItemsCount: itemsQuery.data?.comparisonItems?.itemList?.length ?? 0,
		responseErrors: itemsQuery.data?.comparisonItems?.errors || [],

		// Statuses
		isLoading:
			(shouldFetchInfo && detailQuery.isLoading) ||
			(shouldFetchItems && itemsQuery.isLoading),
		isError: detailQuery.isError || itemsQuery.isError,
		error: detailQuery.error || itemsQuery.error,
	};
};
