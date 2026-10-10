import { describe, expect, it } from "vitest";
import { exportProgressPercent } from "@/hooks/useExport";

describe("exportProgressPercent", () => {
	it("is a whole percentage of the records fetched", () => {
		expect(exportProgressPercent(250, 1000)).toBe(25);
		expect(exportProgressPercent(1, 3)).toBe(33);
	});

	// An empty filter result divided 0 by 0 and the dialog said "NaN% complete".
	it("calls an export of nothing finished rather than NaN", () => {
		expect(exportProgressPercent(0, 0)).toBe(100);
	});

	it("never passes 100", () => {
		expect(exportProgressPercent(1001, 1000)).toBe(100);
	});
});
