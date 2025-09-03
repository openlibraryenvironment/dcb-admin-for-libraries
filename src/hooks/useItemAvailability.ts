import { ItemAvailabilityResponse } from "@models/ItemAvailabilityResponse";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchItemAvailability = async (
	recordId: string,
	apiBaseUrl: string
): Promise<ItemAvailabilityResponse> => {
	const { data } = await axios.get(`${apiBaseUrl}/items/availability`, {
		params: { clusteredBibId: recordId },
	});
	return data;
};

export const useItemAvailability = (recordId: string, apiBaseUrl: string) => {
	return useQuery({
		// A unique key for this query, crucial for caching
		queryKey: ["availability", recordId, apiBaseUrl],

		// The function that will be executed to fetch the data
		queryFn: () => fetchItemAvailability(recordId, apiBaseUrl),

		// IMPORTANT: This prevents the query from running automatically on mount
		enabled: false,

		// Optional: Prevents refetching when the window is refocused
		refetchOnWindowFocus: false,
	});
};
