import { describe, expect, it } from "vitest";

import {
	isReadOnly,
	isReadOnlyAllowed,
	READ_ONLY_HOME,
} from "../src/helpers/readOnlyAccess";

describe("isReadOnly", () => {
	it("gives full access to a library administrator alone", () => {
		expect(isReadOnly(["LIBRARY_ADMIN"])).toBe(false);
		expect(isReadOnly(["LIBRARY_ADMIN", "LIBRARY_READ_ONLY"])).toBe(true);
		expect(isReadOnly(["LIBRARY_READ_ONLY"])).toBe(true);
	});

	it("denies by default: a role it does not know, or none, is read-only", () => {
		expect(isReadOnly(["CONSORTIUM_ADMIN"])).toBe(true);
		expect(isReadOnly([])).toBe(true);
		expect(isReadOnly(undefined)).toBe(true);
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

	it("allows their own preferences and the accessibility statement", () => {
		expect(isReadOnlyAllowed("/preferences")).toBe(true);
		expect(isReadOnlyAllowed("/accessibility")).toBe(true);
	});

	it("refuses everything else", () => {
		for (const path of [
			"/",
			"/insights",
			"/patronRequests",
			"/mappings",
			"/service",
			"/library",
			"/contacts",
		]) {
			expect(isReadOnlyAllowed(path), path).toBe(false);
		}
	});

	it("is not fooled by a path that merely contains the word", () => {
		expect(isReadOnlyAllowed("/admin/requesting-report")).toBe(false);
		expect(isReadOnlyAllowed("/logoutish")).toBe(false);
		expect(isReadOnlyAllowed("/preferencesx")).toBe(false);
	});
});
