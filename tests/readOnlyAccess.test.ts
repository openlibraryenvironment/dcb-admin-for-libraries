import { describe, expect, it } from "vitest";

import {
	isReadOnly,
	isReadOnlyAllowed,
	READ_ONLY_HOME,
} from "../src/helpers/readOnlyAccess";

describe("isReadOnly", () => {
	it("reads the role, and tolerates an absent list", () => {
		expect(isReadOnly(["LIBRARY_READ_ONLY"])).toBe(true);
		expect(isReadOnly(["LIBRARY_ADMIN", "LIBRARY_READ_ONLY"])).toBe(true);
		expect(isReadOnly(["LIBRARY_ADMIN"])).toBe(false);
		expect(isReadOnly([])).toBe(false);
		expect(isReadOnly(undefined)).toBe(false);
	});
});

describe("isReadOnlyAllowed", () => {
	/**
	 * The bug this replaces: the old test was `includes("/requesting/")`, with a
	 * trailing slash, so the destination of the redirect did not satisfy the
	 * predicate that caused it.
	 */
	it("allows the page it redirects to", () => {
		expect(isReadOnlyAllowed(READ_ONLY_HOME)).toBe(true);
	});

	it("allows everything below it", () => {
		expect(isReadOnlyAllowed("/requesting/abc-123")).toBe(true);
		expect(isReadOnlyAllowed("/requesting/abc-123/items")).toBe(true);
	});

	it("allows signing out", () => {
		expect(isReadOnlyAllowed("/logout")).toBe(true);
	});

	it("refuses everything else", () => {
		for (const path of [
			"/",
			"/insights",
			"/patronRequests",
			"/mappings",
			"/settings",
			"/contacts",
		]) {
			expect(isReadOnlyAllowed(path), path).toBe(false);
		}
	});

	it("is not fooled by a path that merely contains the word", () => {
		expect(isReadOnlyAllowed("/admin/requesting-report")).toBe(false);
		expect(isReadOnlyAllowed("/logoutish")).toBe(false);
	});
});
