import {
	availabilityQueryOptions,
	fetchClusterAvailability,
} from "@helpers/availabilityApi";
import { createConcurrencyLimit } from "@helpers/concurrencyLimit";
import { useQuery } from "@tanstack/react-query";

// Per tab. A results page is up to 100 cards, and each card's call is a fan-out
// to every member LMS; without this, scrolling a page sent them all at once.
const limitCardFetch = createConcurrencyLimit(4);

export const useItemAvailability = (recordId: string, apiBaseUrl: string) => {
	return useQuery({
		...availabilityQueryOptions(apiBaseUrl, recordId),
		queryFn: ({ signal }) =>
			limitCardFetch(
				() => fetchClusterAvailability(apiBaseUrl, recordId, undefined, signal),
				signal,
			),
		// Not on mount: SearchResultComponent fires this from an IntersectionObserver,
		// so a page of results does not fan out to every member LMS at once.
		enabled: false,
	});
};
