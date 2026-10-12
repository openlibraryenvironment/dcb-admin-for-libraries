import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

const sources = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sources(path);
		return /\.tsx?$/.test(name) ? [path] : [];
	});

const all = sources(SRC)
	.map((path) => readFileSync(path, "utf8"))
	.join("\n");

// vite.config.ts aliases these features' libraries to a stub that throws. Offering one of
// them again means removing its entry from EXCLUDED_PACKAGES in the same change.
describe("features whose libraries are left out of the build", () => {
	it("Excel export is offered nowhere", () => {
		expect(all).not.toMatch(/exportDataAsExcel|GridExcelExportMenuItem|ExportExcel\b/);
		expect(all).toMatch(/excelOptions:\s*\{\s*disableToolbarButton:\s*true\s*\}/);
	});

	it("chart image export is offered nowhere", () => {
		const charts = sources(SRC)
			.map((path) => readFileSync(path, "utf8"))
			.filter((source) => source.includes("@mui/x-charts"));
		expect(charts.length).toBeGreaterThan(0);
		for (const source of charts) {
			expect(source).not.toMatch(/exportAsImage|ChartsToolbar|showToolbar/);
		}
	});
});
