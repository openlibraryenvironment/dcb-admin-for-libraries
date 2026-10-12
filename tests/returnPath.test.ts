import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@helpers/returnPath";

const ORIGIN = "https://mobius.kihosting.net";
const BASE = "/dcb-admin-for-libraries/";

describe("safeReturnPath", () => {
	it("keeps a path inside the app, with its search and hash", () => {
		expect(safeReturnPath("/dcb-admin-for-libraries/mappings?x=1#a", BASE, ORIGIN)).toBe(
			"/dcb-admin-for-libraries/mappings?x=1#a",
		);
	});

	it.each([
		["another app on the same origin", "/dcb-admin/patronRequests"],
		["a protocol-relative URL", "//evil.example/dcb-admin-for-libraries/"],
		["a backslash the browser reads as a slash", "/\\evil.example"],
		["an absolute URL elsewhere", "https://evil.example/dcb-admin-for-libraries/"],
		["a script URL", "javascript:alert(1)"],
		["nothing", null],
	])("refuses %s", (_, path) => {
		expect(safeReturnPath(path, BASE, ORIGIN)).toBeNull();
	});

	it("accepts any same-origin path when the app is at the root", () => {
		expect(safeReturnPath("/settings", "/", ORIGIN)).toBe("/settings");
		expect(safeReturnPath("//evil.example", "/", ORIGIN)).toBeNull();
	});
});
