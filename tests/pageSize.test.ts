import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	clampPageSize,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	PAGE_SIZE_OPTIONS,
} from "../src/constants/dataGrid/pagination";

/**
 * "Rows returned to a single UI interaction: <= 100, always paged" is a scale
 * constant, not a preference. 200 was on the grid's own menu and was the
 * fallback page size on four route queries, so a reader could pull twice the
 * allowed number from dcb-service without doing anything unusual.
 */
describe("the page size bound", () => {
	it("offers nothing above the bound", () => {
		expect(PAGE_SIZE_OPTIONS.length).toBeGreaterThan(0);
		expect(Math.max(...PAGE_SIZE_OPTIONS)).toBeLessThanOrEqual(MAX_PAGE_SIZE);
	});

	it("brings anything else back inside it", () => {
		expect(clampPageSize(200)).toBe(DEFAULT_PAGE_SIZE);
		expect(clampPageSize(1000)).toBe(DEFAULT_PAGE_SIZE);
		expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
		expect(clampPageSize("100")).toBe(DEFAULT_PAGE_SIZE);
		expect(clampPageSize(-1)).toBe(DEFAULT_PAGE_SIZE);
	});

	it("leaves a size that is on the list alone", () => {
		for (const size of PAGE_SIZE_OPTIONS) {
			expect(clampPageSize(size)).toBe(size);
		}
	});

	it("is the default itself", () => {
		expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
	});
});

interface Exception {
	/** The exact sizes excused. A different one in the same file still fails. */
	sizes: number[];
	reason: string;
}

/**
 * Declared exceptions, by file AND by the size excused, so that naming a file
 * once does not excuse whatever is added to it next. Each has to be argued for
 * here rather than passed over in review.
 */
const ALLOWED = new Map<string, Exception>([
	[
		"src/hooks/useExport.ts",
		{
			sizes: [1000],
			reason:
				"The export walks the whole result set in batches, because the user asked for every row. Bounded by the grid filter in force.",
		},
	],
	[
		"src/routes/__authenticated/patronRequests/index.tsx",
		{
			sizes: [100000],
			reason:
				"KNOWN VIOLATION, not an exemption. Filtering by publisher or title fetches up to 100,000 requests into the browser and matches them there, because dcb-service cannot filter on either field; the code says so itself. Removing it needs the server-side filter, so it is named here rather than quietly allowed.",
		},
	],
]);

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name).replaceAll("\\", "/");
		if (entry.isDirectory()) return sources(path);
		return /\.tsx?$/.test(entry.name) ? [path] : [];
	});

describe("no request asks for more rows than the bound", () => {
	const files = sources("src");

	it("finds the source tree, so it cannot pass vacuously", () => {
		expect(files.length).toBeGreaterThan(100);
	});

	it("has no undeclared page size above the bound", () => {
		const offenders: string[] = [];
		for (const file of files) {
			const excused = ALLOWED.get(file)?.sizes ?? [];
			const lines = readFileSync(file, "utf8").split("\n");
			for (const [index, text] of lines.entries()) {
				if (text.trimStart().startsWith("//")) continue;
				for (const match of text.matchAll(
					/\b(?:pagesize|pageSize|rowsPerPage)\W{0,4}(\d+)/gi,
				)) {
					const size = Number(match[1]);
					if (size > MAX_PAGE_SIZE && !excused.includes(size)) {
						offenders.push(`${file}:${index + 1}  ${text.trim()}`);
					}
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("every declared exception still asks for the size it excuses", () => {
		for (const [file, { sizes, reason }] of ALLOWED) {
			const source = readFileSync(file, "utf8");
			expect(reason.length, file).toBeGreaterThan(60);
			for (const size of sizes) {
				expect(source, `${file} no longer asks for ${size}`).toContain(
					String(size),
				);
			}
		}
	});
});
