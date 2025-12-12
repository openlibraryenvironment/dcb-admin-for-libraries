import { TFunction } from "i18next";

interface LiveAvailabilityApiError {
	message: string;
	[key: string]: any;
}

export const getAggregatedErrorMessage = (
	errors: (LiveAvailabilityApiError | string)[],
	t: TFunction
): string => {
	const bibs = new Set<string>();
	const libraries = new Set<string>();

	// Define our anchor phrases - we want bibs and hosts
	const BIB_PREFIX = "for bib: ";
	const HOST_PREFIX = " from host: ";

	errors.forEach((err) => {
		const msg = typeof err === "string" ? err : err?.message;
		if (!msg) return;

		//Check if this is the specific error type we are looking for
		if (!msg.includes(BIB_PREFIX) || !msg.includes(HOST_PREFIX)) {
			return;
		}

		try {
			// Message: "... for bib: [ID] from host: [HOST]"

			const bibStartIndex = msg.indexOf(BIB_PREFIX) + BIB_PREFIX.length;
			const hostStartIndex = msg.indexOf(HOST_PREFIX);

			const bibId = msg.substring(bibStartIndex, hostStartIndex).trim();
			const hostId = msg.substring(hostStartIndex + HOST_PREFIX.length).trim();

			if (bibId) bibs.add(bibId);

			if (hostId) {
				// If we want to make the library codes look nicer, do it here
				libraries.add(hostId.split("_").join(" "));
			}
		} catch (e) {
			// Fallback if parsing fails for some reason
			console.warn("Error parsing message", msg);
		}
	});

	// 3. Construct the message
	if (bibs.size > 0 || libraries.size > 0) {
		return t("ui.feedback.error.fetch_items_aggregated", {
			bibs: Array.from(bibs).join(", "),
			libraries: Array.from(libraries).join(", "),
			count: bibs.size,
		});
	}
	// Fall back to general error
	return t("ui.feedback.error.general");
};
