import axios from "axios";

/**
 * The query policy for GET /items/availability.
 *
 * One request here becomes one outbound call per member LMS - tens of them,
 * to third-party systems we do not own, some of them decades old. Everything
 * below follows from that.
 */

/** Attempts AFTER the first. Three was the library's default; this is two. */
const MAX_RETRIES = 2;
const FIRST_DELAY_MS = 2_000;
const MAX_DELAY_MS = 15_000;
const JITTER_MS = 1_000;

/**
 * A 4xx will not become a 2xx by being asked again: the bib id is wrong, the
 * token is wrong, or the caller is not allowed. Retrying it just fans out
 * again.
 */
export const isClientError = (error: unknown): boolean => {
	const status = axios.isAxiosError(error) ? error.response?.status : undefined;
	return status !== undefined && status >= 400 && status < 500;
};

export const retryAvailability = (
	failureCount: number,
	error: unknown,
): boolean => !isClientError(error) && failureCount < MAX_RETRIES;

/**
 * Exponential, and jittered because every card on a results page runs its own
 * copy of this query: without the jitter a failing LMS gets them all back at
 * the same instant, which is the retry storm rather than a retry.
 */
export const availabilityRetryDelay = (attemptIndex: number): number =>
	Math.min(FIRST_DELAY_MS * 2 ** attemptIndex, MAX_DELAY_MS) +
	Math.random() * JITTER_MS;

/**
 * `staleTime` matches the five minutes useClusterDetail already chose rather
 * than introducing a second number. It does not make the data stale to a user
 * who asks: an explicit refetch() ignores it, and every call site here is
 * triggered by one.
 */
export const AVAILABILITY_QUERY_POLICY = {
	retry: retryAvailability,
	retryDelay: availabilityRetryDelay,
	staleTime: 1000 * 60 * 5,
	// Alt-tabbing back to the page is not a reason to call every member LMS again.
	refetchOnWindowFocus: false,
} as const;
