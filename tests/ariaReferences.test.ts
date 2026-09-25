import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// axe reports a dangling aria-labelledby as INCOMPLETE, not a violation, and the
// e2e fixture reads only `violations` - so five of these survived a green gate.
// This reads the source instead: an id that is written but never defined cannot
// name anything, whatever page it is on.

const SRC = "src";

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(path) && !path.endsWith("routeTree.gen.ts")
			? [path]
			: [];
	});

/**
 * Strips JSX comment blocks so a reference inside commented-out markup is not
 * reported. Two of these lived in dead `{/* <Dialog ... *\/}` blocks and are not
 * defects - the dead code is, and no-commented-out-code is the rule for that.
 */
const live = (source: string): string =>
	source.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");

const ID_ATTR = /\bid=(?:"([^"]+)"|\{`([^`$]+)`\})/g;

// Deliberately NOT aria-controls: it names an element a component library may
// create for you. MUI's Accordion takes the summary's aria-controls and uses it
// as the id of the region it renders (Accordion.js:216), so a static read of the
// source sees a reference with no definition and is wrong.
const NAME_REF = /\baria-(?:labelledby|describedby)="([^"]+)"/g;

const matches = (text: string, pattern: RegExp): string[] => {
	const found: string[] = [];
	for (const m of text.matchAll(pattern)) {
		found.push((m[1] ?? m[2]).trim());
	}
	return found;
};

describe("aria id references", () => {
	const files = sourceFiles(SRC);

	// One document at a time is the wrong unit - a dialog's title can be defined
	// in a component the reference does not import - so ids are pooled across the
	// application and each reference must find one somewhere.
	const defined = new Set<string>();
	for (const file of files) {
		for (const id of matches(live(readFileSync(file, "utf8")), ID_ATTR)) {
			id.split(/\s+/).forEach((part) => defined.add(part));
		}
	}

	it("finds at least one id, so a broken scan cannot pass vacuously", () => {
		expect(defined.size).toBeGreaterThan(5);
	});

	it.each(files)("%s references only ids that exist", (file) => {
		const dangling = matches(live(readFileSync(file, "utf8")), NAME_REF)
			.flatMap((value) => value.split(/\s+/))
			.filter((id) => id.length > 0 && !defined.has(id));

		expect(dangling).toEqual([]);
	});
});
