import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// eslint-plugin-i18next only inspects JSX, so a literal in a plain object - which
// is what a GridColDef is - passes the lint gate. 100 of the 126 column headers
// in this application were English literals with a comment beside them reading
// "Lots of translation keys needed".

const COLUMNS_DIR = "src/helpers/dataGrid/columns";

describe("grid column headers", () => {
	const files = readdirSync(COLUMNS_DIR).filter((f) => /\.tsx?$/.test(f));

	it("finds the column modules, so a broken scan cannot pass vacuously", () => {
		expect(files.length).toBeGreaterThan(3);
	});

	it.each(files)("%s has no hardcoded headerName", (file) => {
		const source = readFileSync(join(COLUMNS_DIR, file), "utf8");
		const literals = [...source.matchAll(/headerName:\s*"([^"]*)"/g)].map(
			(m) => m[1],
		);
		expect(literals).toEqual([]);
	});
});
