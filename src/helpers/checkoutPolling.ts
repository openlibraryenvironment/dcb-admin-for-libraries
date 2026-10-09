import { successfulExpeditedCheckoutStatuses } from "@constants/statuses/successfulExpeditedCheckoutStatuses";

export const CHECKOUT_POLL_MS = 10_000;

export type CheckoutOutcome = "waiting" | "completed" | "failed";

/** What a patron request's status says about an instant checkout. */
export const checkoutOutcome = (status: string | undefined): CheckoutOutcome => {
	if (status && successfulExpeditedCheckoutStatuses.includes(status)) {
		return "completed";
	}
	return status === "ERROR" ? "failed" : "waiting";
};

/**
 * How long until the request is asked about again: never, once the checkout has
 * an outcome or the wait has timed out. Polling past either asked dcb-service
 * every ten seconds for as long as the dialog stayed open.
 */
export const nextCheckoutPoll = (
	status: string | undefined,
	timedOut: boolean,
): number | false =>
	timedOut || checkoutOutcome(status) !== "waiting" ? false : CHECKOUT_POLL_MS;
