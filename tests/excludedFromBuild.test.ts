import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

const sources = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sources(path);
		return /\.tsx?$/.test(name) ? [path] : [];
	});

const files = sources(SRC).map((path) => ({
	path: relative(ROOT, path).split(sep).join("/"),
	source: readFileSync(path, "utf8"),
}));
const all = files.map(({ source }) => source).join("\n");
const viteConfig = readFileSync(join(ROOT, "vite.config.ts"), "utf8");

// vite.config.ts aliases an excluded feature's library to a stub that throws. Offering it
// again means removing its entry from EXCLUDED_PACKAGES in the same change.
describe("features whose libraries are left out of the build", () => {
	it("chart image export is offered nowhere, and its library stays excluded", () => {
		const charts = files.filter(({ source }) => source.includes("@mui/x-charts"));
		expect(charts.length).toBeGreaterThan(0);
		for (const { source } of charts) {
			expect(source).not.toMatch(/exportAsImage|ChartsToolbar|showToolbar/);
		}
		expect(viteConfig).toMatch(/EXCLUDED_PACKAGES = \[[^\]]*"rasterizehtml"/);
	});
});

// The grid's own Excel export sees only the page on screen, and it bypasses the library
// guard every export goes through. docs/export.md.
describe("Excel export", () => {
	it("is never the grid's own", () => {
		expect(all).not.toMatch(/exportDataAsExcel|GridExcelExportMenuItem|ExportExcel\b/);
		expect(all).toMatch(/excelOptions:\s*\{\s*disableToolbarButton:\s*true\s*\}/);
	});

	it("loads its library in one module, and only on demand", () => {
		const importers = files.filter(({ source }) =>
			source.includes("@mui/x-internal-exceljs-fork"),
		);
		expect(importers.map(({ path }) => path)).toEqual([
			"src/helpers/dataGrid/xlsxWorkbook.ts",
		]);
		const [{ source }] = importers;
		expect(source).toMatch(/await import\("@mui\/x-internal-exceljs-fork"\)/);
		expect(source).not.toMatch(/^import\s[^(]*from\s+"@mui\/x-internal-exceljs-fork"/m);
		expect(viteConfig).not.toMatch(/EXCLUDED_PACKAGES = \[[^\]]*exceljs/);
	});

	it("writes a workbook only from the guarded export hook", () => {
		const callers = files
			.filter(({ path }) => path !== "src/helpers/dataGrid/xlsxWorkbook.ts")
			.filter(({ source }) => /\bbuildXlsx\b/.test(source))
			.map(({ path }) => path);
		expect(callers).toEqual(["src/hooks/useExport.ts"]);
	});
});
