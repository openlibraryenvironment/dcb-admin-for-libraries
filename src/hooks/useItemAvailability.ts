import { ItemAvailabilityResponse } from "@models/ItemAvailabilityResponse";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchItemAvailability = async (
	recordId: string,
	apiBaseUrl: string,
): Promise<ItemAvailabilityResponse> => {
	const { data } = await axios.get(`${apiBaseUrl}/items/availability`, {
		params: { clusteredBibId: recordId },
	});
	return data;
};

export const useItemAvailability = (recordId: string, apiBaseUrl: string) => {
	return useQuery({
		queryKey: ["availability", recordId, apiBaseUrl],
		queryFn: () => fetchItemAvailability(recordId, apiBaseUrl),
		// IMPORTANT: This prevents the query from running automatically on mount
		enabled: false,
		refetchOnWindowFocus: false,
	});
};
