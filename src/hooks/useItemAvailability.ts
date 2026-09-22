import { AVAILABILITY_QUERY_POLICY } from "@constants/availability";
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
		...AVAILABILITY_QUERY_POLICY,
		// Not on mount: SearchResultComponent fires this from an IntersectionObserver,
		// so a page of results does not fan out to every member LMS at once.
		enabled: false,
	});
};
