import { describe, expect, it } from "vitest";

import enGB from "../src/locales/en-GB/en-GB.json";
import enUS from "../src/locales/en-US/en-US.json";

interface Tree {
	[key: string]: string | Tree;
}

const flatten = (tree: Tree, prefix = ""): Map<string, string> => {
	const out = new Map<string, string>();
	for (const [key, value] of Object.entries(tree)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "string") out.set(path, value);
		else for (const [k, v] of flatten(value, path)) out.set(k, v);
	}
	return out;
};

/** What must survive translation untouched: interpolations, nesting, and markup. */
const tokens = (value: string) =>
	(value.match(/\{\{[^}]+\}\}|\$t\([^)]*\)|<\/?[a-zA-Z]+\/?>/g) ?? []).sort();

const gb = flatten(enGB as Tree);
const us = flatten(enUS as Tree);

/**
 * Lower- or title-case only: an upper-case FINALISED is a dcb-service status,
 * the same on the wire in either English. "fulfilled" is both.
 */
const BRITISH =
	/\b[Cc]olour|\b[Oo]rganis|\b[Ff]ulfil(?:s?\b|ment)|\b[Cc]ancelled|\b[Ff]inalis|\b[Cc]atalogue/;
const AMERICAN =
	/\b[Cc]olor|\b[Oo]rganiz|\b[Ff]ulfill(?:s?\b|ment)|\b[Cc]anceled|\b[Ff]inaliz|\b[Cc]atalog\b/;

const matching = (bundle: Map<string, string>, spelling: RegExp) =>
	[...bundle.entries()]
		.filter(([, value]) => spelling.test(value))
		.map(([key, value]) => `${key}: ${value}`);

describe("the two English translations", () => {
	it("carry exactly the same keys", () => {
		const onlyGb = [...gb.keys()].filter((key) => !us.has(key));
		const onlyUs = [...us.keys()].filter((key) => !gb.has(key));

		expect({ onlyGb, onlyUs }).toEqual({ onlyGb: [], onlyUs: [] });
	});

	it("keep every interpolation, nested key and tag in each string", () => {
		const drifted = [...gb.entries()]
			.filter(([key, value]) => {
				const other = us.get(key);
				return (
					other !== undefined &&
					JSON.stringify(tokens(value)) !== JSON.stringify(tokens(other))
				);
			})
			.map(([key]) => key);

		expect(drifted).toEqual([]);
	});

	it("each spell their own way", () => {
		expect(matching(us, BRITISH)).toEqual([]);
		expect(matching(gb, AMERICAN)).toEqual([]);
	});

	it("are actually different Englishes", () => {
		expect(gb.get("display.mode.label")).toBe("Colour scheme");
		expect(us.get("display.mode.label")).toBe("Color scheme");
	});
});
