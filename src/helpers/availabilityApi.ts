import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

import { AVAILABILITY_QUERY_POLICY } from "@constants/availability";
import { ItemAvailabilityResponse } from "@models/ItemAvailabilityResponse";

/** `none` turns off the server's suppressed, deleted and non-supplying filters. */
export type AvailabilityFilters = "none";

/**
 * No token and no headers: the endpoint is anonymous and its answer does not
 * depend on who asks, so every caller shares one cache entry per question.
 */
export const availabilityKeys = {
	cluster: (apiBase: string, clusterId: string, filters?: AvailabilityFilters) =>
		["availability", apiBase, clusterId, filters ?? "default"] as const,
	/** After a checkout: its own entry, because the record's holds no due date yet. */
	checkedOut: (apiBase: string, patronRequestId: string, clusterId: string) =>
		["availability", "checkedOut", apiBase, patronRequestId, clusterId] as const,
};

export const fetchClusterAvailability = async (
	apiBase: string,
	clusterId: string,
	filters: AvailabilityFilters | undefined,
	signal: AbortSignal,
): Promise<ItemAvailabilityResponse> => {
	const { data } = await axios.get<ItemAvailabilityResponse>(
		`${apiBase}/items/availability`,
		{ params: { clusteredBibId: clusterId, filters }, signal },
	);
	return data;
};

export const availabilityQueryOptions = (
	apiBase: string,
	clusterId: string,
	filters?: AvailabilityFilters,
) =>
	queryOptions({
		queryKey: availabilityKeys.cluster(apiBase, clusterId, filters),
		queryFn: ({ signal }) =>
			fetchClusterAvailability(apiBase, clusterId, filters, signal),
		...AVAILABILITY_QUERY_POLICY,
		meta: OPTIONAL_QUERY,
	});
