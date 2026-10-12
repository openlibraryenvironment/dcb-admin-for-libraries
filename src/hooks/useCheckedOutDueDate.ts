import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { AVAILABILITY_QUERY_POLICY } from "@constants/availability";
import { Item } from "@models/Item";

interface CheckedOutDueDate {
	patronRequestId: string | null;
	bibClusterId: string | null | undefined;
	/** True once the checkout has completed: the due date does not exist before. */
	checkoutCompleted: boolean;
	isCheckedOutItem: (item: Item) => boolean;
	apiBase: string;
	headers: Record<string, string>;
}

/**
 * The due date of an item just checked out, from ONE availability fan-out after
 * the checkout. Keyed on the patron request, not the record: the availability
 * fetched to pick the item is still fresh at that point, holds no due date, and
 * under the record's key would be served from cache instead of asked again.
 */
export const useCheckedOutDueDate = ({
	patronRequestId,
	bibClusterId,
	checkoutCompleted,
	isCheckedOutItem,
	apiBase,
	headers,
}: CheckedOutDueDate) => {
	const query = useQuery({
		queryKey: [
			"availability",
			"checkedOut",
			patronRequestId,
			bibClusterId,
			headers,
			apiBase,
		],
		queryFn: async ({ signal }) => {
			const response = await axios.get(`${apiBase}/items/availability`, {
				headers,
				params: { clusteredBibId: bibClusterId },
				signal,
			});
			return response.data as { itemList?: Item[] };
		},
		...AVAILABILITY_QUERY_POLICY,
		enabled: checkoutCompleted && !!patronRequestId && !!bibClusterId,
	});

	const dueDate = query.data?.itemList?.find(isCheckedOutItem)?.dueDate;

	return {
		dueDate,
		// Asked and answered without one, or not answerable at all.
		dueDateUnavailable: query.isError || (query.isSuccess && !dueDate),
	};
};
