import { describe, expect, it } from "vitest";
import { hostLmsLibraryOptions } from "@helpers/hostLmsLibraryOptions";
import type { Library } from "@models/Library";

const library = (fullName: string, code: string | null) =>
	({
		fullName,
		agency: { hostLms: code ? { code } : null },
	}) as unknown as Library;

describe("hostLmsLibraryOptions", () => {
	it("gives a shared Host LMS one option naming every library on it", () => {
		expect(
			hostLmsLibraryOptions([
				library("Anytown Library", "shared"),
				library("Othertown Library", "shared"),
				library("Solo Library", "solo"),
			]),
		).toEqual([
			{ value: "shared", label: "Anytown Library, Othertown Library" },
			{ value: "solo", label: "Solo Library" },
		]);
	});

	it("leaves out a library with no Host LMS", () => {
		expect(hostLmsLibraryOptions([library("Nowhere Library", null)])).toEqual(
			[],
		);
	});
});
