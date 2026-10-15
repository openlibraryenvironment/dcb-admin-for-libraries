export type ServiceFailure = "maintenance" | "network" | null;

// Each browser words a failed fetch differently: Chromium, Firefox, Safari, RN polyfills.
const NETWORK_MESSAGES = ["Failed to fetch", "NetworkError", "Load failed", "Network request failed"];

/** What a failed request says about the service as a whole, if anything. */
export function classifyServiceError(error: unknown): ServiceFailure {
	const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
	if (status === 503) return "maintenance";

	const message = (error as { message?: unknown } | undefined)?.message;
	if (typeof message === "string" && NETWORK_MESSAGES.some((m) => message.includes(m))) {
		return "network";
	}
	return null;
}

/**
 * Once, and only for a failure that may pass: no answer at all, or a server fault. A 4xx,
 * or a GraphQL error carried on a 200, will be the same answer the second time.
 */
export const retryTransientOnce = (failureCount: number, error: unknown): boolean => {
	const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
	return failureCount < 1 && (status === undefined || status >= 500);
};

/** For a query whose page can explain its own failure: it never sends the whole app to an error page. */
export const OPTIONAL_QUERY = { optional: true } as const;
