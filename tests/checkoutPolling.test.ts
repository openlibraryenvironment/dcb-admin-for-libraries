import { describe, expect, it } from "vitest";

import {
	CHECKOUT_POLL_MS,
	checkoutOutcome,
	nextCheckoutPoll,
} from "../src/helpers/checkoutPolling";

describe("polling an instant checkout", () => {
	it("keeps asking while the request is on its way", () => {
		expect(nextCheckoutPoll(undefined, false)).toBe(CHECKOUT_POLL_MS);
		expect(nextCheckoutPoll("REQUEST_PLACED_AT_SUPPLYING_AGENCY", false)).toBe(
			CHECKOUT_POLL_MS,
		);
	});

	it("stops once the wait has timed out", () => {
		expect(nextCheckoutPoll("REQUEST_PLACED_AT_SUPPLYING_AGENCY", true)).toBe(
			false,
		);
	});

	it("stops on an error, which no later poll will turn into a loan", () => {
		expect(checkoutOutcome("ERROR")).toBe("failed");
		expect(nextCheckoutPoll("ERROR", false)).toBe(false);
	});

	it("stops once the item is checked out", () => {
		expect(checkoutOutcome("LOANED")).toBe("completed");
		expect(nextCheckoutPoll("LOANED", false)).toBe(false);
	});
});
