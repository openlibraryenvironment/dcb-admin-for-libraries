import { describe, expect, it } from "vitest";
import { buildWalkUpPayload, walkUpRefusalKey } from "./walkUpRequest";

describe("buildWalkUpPayload", () => {
	it("sends exactly the fields dcb-service requires, patronAgencyCode among them", () => {
		const payload = buildWalkUpPayload({
			staffHostLmsCode: "LENDER-SYSTEM",
			staffAgencyCode: "lender",
			itemBarcode: "3900001",
			pickupLocationCode: "location-uuid",
			patronLocalId: "patron-1",
			patronAgencyCode: "borrower",
			patronHostLmsCode: "BORROWER-SYSTEM",
		});

		// agencyCode was sent in its place and every walk-up was refused
		expect(Object.keys(payload).sort()).toEqual(
			[
				"itemAgencyCode",
				"itemBarcode",
				"itemHostLmsCode",
				"patronAgencyCode",
				"patronHostLmsCode",
				"patronLocalId",
				"pickupLocationCode",
			].sort(),
		);
		expect(payload.patronAgencyCode).toBe("borrower");
		expect(payload).not.toHaveProperty("patronBarcode");
	});
});

describe("walkUpRefusalKey", () => {
	it("names each refusal the service can make", () => {
		expect(walkUpRefusalKey(400, [{ code: "WALK_UP_SAME_LIBRARY" }])).toBe(
			"requesting.quick_walk_up.errors.walk_up_same_library",
		);
		expect(walkUpRefusalKey(400, [{ code: "ITEM_NOT_FOUND" }])).toBe(
			"requesting.quick_walk_up.errors.item_not_found",
		);
	});

	it("says the item is not at the caller's library when the service refuses the caller", () => {
		expect(walkUpRefusalKey(403, undefined)).toBe(
			"requesting.quick_walk_up.errors.forbidden",
		);
	});

	it("falls back to the generic message for anything else", () => {
		expect(walkUpRefusalKey(500, undefined)).toBe(
			"requesting.staff_request.patron.error.request.generic",
		);
	});
});
