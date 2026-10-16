import { describe, expect, it } from "vitest";
import { autoHideFor } from "@/components/TimedAlert/autoHideFor";

describe("autoHideFor", () => {
	it("closes a success by itself", () => {
		expect(autoHideFor("success")).toBe(6000);
	});

	it.each(["error", "warning", "info"] as const)(
		"leaves a %s open until it is dismissed",
		(severity) => {
			expect(autoHideFor(severity)).toBeNull();
		},
	);
});
