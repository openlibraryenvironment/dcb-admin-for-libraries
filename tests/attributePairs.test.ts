import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 199 field labels were rendered as plain text beside their values with nothing
 * connecting the two, so a screen reader announced "Full name" and "Anytown
 * Library" as unrelated runs of text (WCAG 1.3.1). They are description lists
 * now, and axe cannot see the difference - which is why this is a static scan
 * rather than a rule.
 */
const COMPONENT = "src/components/Attribute/Attribute.tsx";

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name).replaceAll("\\", "/");
		if (entry.isDirectory()) return sources(path);
		return /\.tsx$/.test(entry.name) ? [path] : [];
	});

describe("field labels", () => {
	const files = sources("src");

	it("finds the source tree, so it cannot pass vacuously", () => {
		expect(files.length).toBeGreaterThan(50);
		expect(files).toContain(COMPONENT);
	});

	it("renders the attributeTitle variant only inside Attribute", () => {
		const offenders = files.filter(
			(file) =>
				file !== COMPONENT &&
				readFileSync(file, "utf8").includes('variant="attributeTitle"'),
		);
		expect(offenders).toEqual([]);
	});

	it("associates the label with the value, in that order", () => {
		const source = readFileSync(COMPONENT, "utf8");
		expect(source).toContain('component="dl"');
		expect(source).toContain('component="dt"');
		expect(source).toContain('component="dd"');
		expect(source.indexOf('component="dt"')).toBeLessThan(
			source.indexOf('component="dd"'),
		);
	});

	it("clears the margin the browser puts on a dd", () => {
		// Without this the values sit 40px in from their labels.
		expect(readFileSync(COMPONENT, "utf8")).toMatch(/component="dd"[\s\S]{0,120}m: 0/);
	});
});
