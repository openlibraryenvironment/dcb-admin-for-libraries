import { describe, it, expect, vi, afterEach } from "vitest";

import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
} from "../src/helpers/patronRequestScope";

/**
 * The borrowing views used to filter on the patron's Host LMS, which on a shared system
 * is every co-tenant library rather than your own - sixty libraries on one Koha could
 * read each other's requests. patronAgencyCode is the correct question, but it only
 * exists from dcb-service 9.0.0, and an older backend rejects an unknown filter name
 * rather than ignoring it.
 *
 * So both halves are asserted: that the flag actually changes the filter, and that an
 * environment which has never heard of it keeps the old one rather than emptying a grid.
 */

const FLAG = "VITE_FEATURE_AGENCY_SCOPED_REQUESTS";

const withFlag = (value: string | undefined) =>
	vi.stubGlobal("window", { __APP_ENV__: { [FLAG]: value } });

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("borrowedByLibraryQuery", () => {
	it("filters on the agency once the backend can answer it", () => {
		withFlag("true");
		expect(borrowedByLibraryQuery("springfield", "SHARED-KOHA")).toBe(
			"patronAgencyCode:springfield",
		);
	});

	it("falls back to the Host LMS on a backend that cannot", () => {
		withFlag(undefined);
		expect(borrowedByLibraryQuery("springfield", "SHARED-KOHA")).toBe(
			"patronHostlmsCode:SHARED-KOHA",
		);
	});

	it("fails closed on anything but an explicit true", () => {
		// envsubst renders an unset variable as the empty string; a bundle built without
		// it leaves it undefined. Reading either as enabled would send a filter the
		// backend rejects, and the grid would be empty rather than merely too broad.
		for (const value of ["", "false", "FALSE", "0", "yes"]) {
			withFlag(value);
			expect(borrowedByLibraryQuery("springfield", "SHARED-KOHA")).toBe(
				"patronHostlmsCode:SHARED-KOHA",
			);
		}
	});
});

describe("hasBorrowingScope", () => {
	it("waits for the value the filter will actually use", () => {
		withFlag("true");
		expect(hasBorrowingScope(undefined, "SHARED-KOHA")).toBe(false);
		expect(hasBorrowingScope("springfield", undefined)).toBe(true);
	});

	it("waits for the Host LMS code when that is what it will send", () => {
		withFlag(undefined);
		expect(hasBorrowingScope("springfield", undefined)).toBe(false);
		expect(hasBorrowingScope(undefined, "SHARED-KOHA")).toBe(true);
	});
});
