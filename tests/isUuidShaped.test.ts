import { describe, expect, it } from "vitest";
import { isUuidShaped } from "@helpers/isUuidShaped";

describe("isUuidShaped", () => {
	it.each([
		"11111111-1111-1111-1111-111111111111",
		"aa000000-1111-5111-9111-111111111111",
		"6F9619FF-8B86-D011-B42D-00C04FC964FF",
	])("accepts %s, whatever its version digits", (id) => {
		expect(isUuidShaped(id)).toBe(true);
	});

	it.each(["not-a-request", "", "11111111-1111-1111-1111-11111111111", "undefined"])(
		"rejects %j",
		(id) => {
			expect(isUuidShaped(id)).toBe(false);
		},
	);
});
