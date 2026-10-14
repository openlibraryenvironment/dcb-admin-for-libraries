import { describe, expect, it } from "vitest";

import { DCBStatus, dcbStatusValueOptions } from "@constants/statuses/DCBStatuses";
import en from "../src/locales/en-GB/en-GB.json" with { type: "json" };

/** PatronRequest.Status in dcb-service (core/model/PatronRequest.java), in its order. */
const SERVICE_STATUSES = [
	"SUBMITTED_TO_DCB",
	"PATRON_VERIFIED",
	"RESOLVED",
	"NOT_SUPPLIED_CURRENT_SUPPLIER",
	"NO_ITEMS_SELECTABLE_AT_ANY_AGENCY",
	"REQUEST_PLACED_AT_SUPPLYING_AGENCY",
	"CONFIRMED",
	"HANDED_OFF_AS_LOCAL",
	"REQUEST_PLACED_AT_BORROWING_AGENCY",
	"REQUEST_PLACED_AT_PICKUP_AGENCY",
	"RECEIVED_AT_PICKUP",
	"READY_FOR_PICKUP",
	"LOANED",
	"PICKUP_TRANSIT",
	"RETURN_TRANSIT",
	"AWAITING_RETURN_TO_SUPPLIER",
	"CANCELLED",
	"COMPLETED",
	"FINALISED",
	"ERROR",
	"ARCHIVED",
];

const labels = en.patron_request.statuses as Record<string, string>;

describe("every status dcb-service can report", () => {
	it.each(SERVICE_STATUSES)("%s can be filtered on and has a label", (status) => {
		expect(status in DCBStatus).toBe(true);
		expect(dcbStatusValueOptions.map((option) => option.value)).toContain(status);
		expect(labels[status]).toBeTruthy();
	});
});
