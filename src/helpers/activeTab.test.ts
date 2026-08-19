import { describe, expect, it } from "vitest";
import { matchActiveTab } from "./activeTab";

const TABS = [
	"/",
	"/requesting",
	"/patronRequests",
	"/supplierRequests",
	"/service",
	"/mappings",
	"/locations",
	"/bibs",
	"/settings",
] as const;

describe("matchActiveTab", () => {
	it("selects the tab for its own route", () => {
		expect(matchActiveTab("/patronRequests", TABS)).toBe("/patronRequests");
	});

	it("selects the ancestor tab for a nested route", () => {
		expect(matchActiveTab("/requesting/abc-123/history", TABS)).toBe(
			"/requesting",
		);
	});

	it("selects home only for the index route", () => {
		expect(matchActiveTab("/", TABS)).toBe("/");
		expect(matchActiveTab("/indexes/consortium", TABS)).toBe(false);
	});

	it("does not let a tab claim a sibling that merely shares its prefix", () => {
		expect(matchActiveTab("/locationsArchive", TABS)).toBe(false);
	});

	it("prefers the longest owning tab", () => {
		expect(matchActiveTab("/requesting", ["/", "/requesting"])).toBe(
			"/requesting",
		);
	});

	it("ignores a trailing slash on either side", () => {
		expect(matchActiveTab("/bibs/", TABS)).toBe("/bibs");
	});

	/**
	 * The regression this file exists for. Tab values were built as browser
	 * paths ("/dcb-admin-for-libraries-dev/requesting") while useLocation()
	 * hands back basepath-relative router paths, so nothing ever matched and the
	 * indicator stayed dead under a deployed base.
	 */
	it("matches under a deployment base, because both sides are router paths", () => {
		expect(matchActiveTab("/requesting/abc-123", TABS)).toBe("/requesting");
		expect(
			matchActiveTab("/dcb-admin-for-libraries-dev/requesting", TABS),
		).toBe(false);
	});
});
