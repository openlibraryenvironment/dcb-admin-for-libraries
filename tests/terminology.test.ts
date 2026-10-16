import { describe, expect, it } from "vitest";

import enGB from "../src/locales/en-GB/en-GB.json";
import enUS from "../src/locales/en-US/en-US.json";

const strings = (node: unknown): string[] =>
	typeof node === "string"
		? [node]
		: node && typeof node === "object"
			? Object.values(node).flatMap(strings)
			: [];

/**
 * One word for one thing. "Walk-up" is always hyphenated; "clean up" is the action in
 * both, and the noun is "clean-up" in British English and "cleanup" in American.
 */
describe.each([
	["en-GB", enGB, /\bcleanup\b/i],
	["en-US", enUS, /\bclean-up\b/i],
])("%s terminology", (_, catalogue, otherNoun) => {
	const all = strings(catalogue);

	it("hyphenates walk-up", () => {
		expect(all.filter((text) => /\bwalk up\b/i.test(text))).toEqual([]);
	});

	it("spells clean-up as the locale does", () => {
		expect(all.filter((text) => otherNoun.test(text))).toEqual([]);
	});

	it("names no service the user cannot see", () => {
		expect(all.filter((text) => /\bdcb-(service|locate)\b/i.test(text))).toEqual([]);
	});
});
