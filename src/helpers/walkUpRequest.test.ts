import { describe, expect, it } from "vitest";
import enGB from "@/locales/en-GB/en-GB.json";
import enUS from "@/locales/en-US/en-US.json";
import { getRequestError } from "./getRequestError";
import { buildWalkUpPayload, walkUpRefusal } from "./walkUpRequest";

const t = (key: string, options?: Record<string, unknown>) =>
	options ? `${key} ${JSON.stringify(options)}` : key;

describe("buildWalkUpPayload", () => {
	const payload = buildWalkUpPayload({
		staffHostLmsCode: "LENDER-SYSTEM",
		staffAgencyCode: "lender",
		itemBarcode: "3900001",
		pickupLocationCode: "location-uuid",
		patronBarcode: "2100042",
		patronLocalId: "patron-1",
		patronAgencyCode: "borrower",
		patronHostLmsCode: "BORROWER-SYSTEM",
	});

	it("sends exactly the fields every released dcb-service requires", () => {
		expect(Object.keys(payload).sort()).toEqual(
			[
				"itemAgencyCode",
				"itemBarcode",
				"itemHostLmsCode",
				"patronAgencyCode",
				"patronBarcode",
				"patronHostLmsCode",
				"patronLocalId",
				"pickupLocationCode",
			].sort(),
		);
	});

	it("names the patron's agency patronAgencyCode, not agencyCode", () => {
		// agencyCode was sent in its place and every walk-up was refused
		expect(payload.patronAgencyCode).toBe("borrower");
		expect(payload).not.toHaveProperty("agencyCode");
	});

	it("still sends the patron barcode, which 8.71.0 to 9.1.0 refuse a walk-up without", () => {
		expect(payload.patronBarcode).toBe("2100042");
	});
});

describe("walkUpRefusal", () => {
	it("names each walk-up refusal the service can make", () => {
		expect(walkUpRefusal(400, [{ code: "WALK_UP_SAME_LIBRARY" }], t)).toBe(
			"requesting.quick_walk_up.errors.walk_up_same_library",
		);
		expect(walkUpRefusal(400, [{ code: "ITEM_NOT_FOUND" }], t)).toBe(
			"requesting.quick_walk_up.errors.item_not_found",
		);
		expect(
			walkUpRefusal(400, [{ code: "WALK_UP_ITEM_ALREADY_REQUESTED" }], t),
		).toBe("requesting.quick_walk_up.errors.walk_up_item_already_requested");
	});

	it("says why a 403 refused it", () => {
		expect(walkUpRefusal(403, undefined, t)).toBe(
			"requesting.quick_walk_up.errors.forbidden",
		);
	});

	it("falls back to the request error, code and description included, for any other check", () => {
		expect(
			walkUpRefusal(400, [{ code: "PATRON_BLOCKED", description: "Blocked" }], t),
		).toBe(
			'requesting.staff_request.patron.error.request.generic {"code":"PATRON_BLOCKED","description":"Blocked"}',
		);
	});

	it("still says something when there is no failed check", () => {
		expect(walkUpRefusal(500, undefined, t)).toBe(
			"requesting.staff_request.patron.error.request.failed",
		);
	});
});

describe("a request refused because a library system was too slow", () => {
	it("is explained on every form, not shown as a raw code", () => {
		expect(
			getRequestError([{ code: "PREFLIGHT_CHECKS_TIMED_OUT", description: "PT45S" }], t),
		).toBe("requesting.staff_request.patron.error.request.timed_out");
		expect(
			walkUpRefusal(400, [{ code: "PREFLIGHT_CHECKS_TIMED_OUT" }], t),
		).toBe("requesting.staff_request.patron.error.request.timed_out");
	});

	it("has a sentence in every locale", () => {
		for (const messages of [enGB, enUS]) {
			expect(
				messages.requesting.staff_request.patron.error.request.timed_out,
			).toEqual(expect.any(String));
		}
	});
});
