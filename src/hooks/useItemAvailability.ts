import { availabilityQueryOptions } from "@helpers/availabilityApi";
import { useQuery } from "@tanstack/react-query";

export const useItemAvailability = (recordId: string, apiBaseUrl: string) => {
	return useQuery({
		...availabilityQueryOptions(apiBaseUrl, recordId),
		// Not on mount: SearchResultComponent fires this from an IntersectionObserver,
		// so a page of results does not fan out to every member LMS at once.
		enabled: false,
	});
};
