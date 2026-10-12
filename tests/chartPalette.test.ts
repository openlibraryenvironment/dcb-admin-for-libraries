import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isDarkScheme } from "../src/hooks/useChartPalette";

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name).replaceAll("\\", "/");
		if (entry.isDirectory()) return sources(path);
		return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")
			? [path]
			: [];
	});

describe("which scheme a chart draws for", () => {
	it("draws the dark palette only for the dark scheme", () => {
		expect(isDarkScheme("dark")).toBe(true);
		expect(isDarkScheme("light")).toBe(false);
		expect(isDarkScheme("highContrast")).toBe(false);
	});

	/**
	 * With cssVariables and colorSchemes, `palette.mode` is the default scheme's,
	 * whatever the user chose - so a chart reading it drew light colours in dark mode.
	 */
	it("is never decided by palette.mode", () => {
		const readers = sources("src").filter((file) =>
			readFileSync(file, "utf8")
				.split("\n")
				.some(
					(line) =>
						/palette\??\.mode\b/.test(line) &&
						!/^\s*(\/\/|\*|\/\*)/.test(line),
				),
		);
		expect(readers).toEqual([]);
	});
});
