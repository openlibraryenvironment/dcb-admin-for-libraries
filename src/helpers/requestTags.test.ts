import { describe, expect, it } from "vitest";
import { addableTags, removableBy, type AppliedTag } from "./requestTags";
import { authorableAs } from "./requestAuthorship";

const damaged: AppliedTag = { code: "DAMAGED", label: "Damaged", agencyCodes: ["AG_A"], consortium: false };
const vocabulary = [
	{ code: "DAMAGED", label: "Damaged", active: true },
	{ code: "SLOW_TO_SHIP", label: "Slow to ship", active: true },
	{ code: "OLD", label: "Retired", active: false },
];

describe("tagging a request", () => {
	it("tags as the user's libraries that are party to the request, and no other", () => {
		expect(authorableAs(["AG_B", "AG_A", "AG_A"], ["AG_A", "AG_B", "AG_C"])).toEqual(["AG_A", "AG_B"]);
		expect(authorableAs(["AG_X"], ["AG_A"])).toEqual([]);
	});

	it("offers only active tags the library has not applied already", () => {
		expect(addableTags(vocabulary, [damaged], "AG_A").map((tag) => tag.code)).toEqual(["SLOW_TO_SHIP"]);
		// Another library's Damaged does not stop this one applying it
		expect(addableTags(vocabulary, [damaged], "AG_B").map((tag) => tag.code)).toEqual([
			"DAMAGED",
			"SLOW_TO_SHIP",
		]);
	});

	it("lets a library remove its own application of a tag, never another's or the consortium's", () => {
		const shared: AppliedTag = { ...damaged, agencyCodes: ["AG_A", "AG_C"], consortium: true };
		expect(removableBy(shared, ["AG_A", "AG_B"])).toEqual(["AG_A"]);
		expect(removableBy(shared, ["AG_B"])).toEqual([]);
	});
});
