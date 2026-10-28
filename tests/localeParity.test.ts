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
const overlay = flatten(enUS as Tree);
/** What an en-US reader sees: the overlay where it has the key, en-GB everywhere else. */
const us = new Map([...gb, ...overlay]);

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

// en-US is an overlay on en-GB, which every key it lacks falls back to: docs/theming.md, "8. Language".
describe("the en-US overlay", () => {
	it("only overrides keys en-GB has", () => {
		expect([...overlay.keys()].filter((key) => !gb.has(key))).toEqual([]);
	});

	it("only carries strings that differ, so it cannot drift back into a copy", () => {
		expect(
			[...overlay].filter(([key, value]) => gb.get(key) === value).map(([key]) => key),
		).toEqual([]);
	});

	it("keeps every interpolation, nested key and tag in each string", () => {
		const drifted = [...overlay]
			.filter(
				([key, value]) =>
					JSON.stringify(tokens(value)) !== JSON.stringify(tokens(gb.get(key) ?? "")),
			)
			.map(([key]) => key);

		expect(drifted).toEqual([]);
	});

	it("leaves an en-US reader no British spelling, and en-GB no American one", () => {
		expect(matching(us, BRITISH)).toEqual([]);
		expect(matching(gb, AMERICAN)).toEqual([]);
	});

	it("makes them actually different Englishes", () => {
		expect(gb.get("display.mode.label")).toBe("Colour scheme");
		expect(us.get("display.mode.label")).toBe("Color scheme");
	});
});
