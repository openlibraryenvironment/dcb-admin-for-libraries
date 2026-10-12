import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ExportScopeError,
	MAX_GUARD_LOCATIONS,
	agencyLocationsQuery,
	exportGuard,
	guardQuery,
	guardedQuery,
	idsQuery,
	isRequestInExportScope,
} from "@helpers/exportScope";

/**
 * An export may only ever contain a request one of the user's libraries is party to: the
 * patron's library, the supplying library, or the library a pickup location belongs to.
 * docs/export.md.
 */

const FLAG = "VITE_FEATURE_AGENCY_SCOPED_REQUESTS";
const withAgencyScope = (on: boolean) =>
	vi.stubGlobal("window", { __APP_ENV__: { [FLAG]: on ? "true" : "false" } });

afterEach(() => {
	vi.unstubAllGlobals();
});

const PICKUP = "aaaaaaaa-0000-4000-8000-000000000001";
const OTHER_PICKUP = "bbbbbbbb-0000-4000-8000-000000000002";

describe("guardQuery", () => {
	it("names the patron's library, the supplier and the pickup, for one library", () => {
		withAgencyScope(true);
		expect(guardQuery(exportGuard(["AB1"], [PICKUP]))).toBe(
			`patronAgencyCode:"AB1" OR supplyingAgencyCode:"AB1" OR pickupLocationCode:"${PICKUP}"`,
		);
	});

	it("covers every library a shared-system user administers", () => {
		withAgencyScope(true);
		expect(guardQuery(exportGuard(["AB1", "ab-2"], []))).toBe(
			'patronAgencyCode:"AB1" OR patronAgencyCode:"ab-2" OR ' +
				'supplyingAgencyCode:"AB1" OR supplyingAgencyCode:"ab-2"',
		);
	});

	it("escapes a code that would otherwise close the term", () => {
		withAgencyScope(true);
		const query = guardQuery(exportGuard(['X" OR status:"COMPLETED', "a\\b"], []));
		expect(query).toContain('patronAgencyCode:"X\\" OR status:\\"COMPLETED"');
		expect(query).toContain('supplyingAgencyCode:"a\\\\b"');
	});

	// 8.71.0 has no patronAgencyCode, and patronHostlmsCode names every co-tenant on a
	// shared system: the guard narrows to what it can prove, it never widens.
	// 8.71.0 cannot ask for the patron's agency, so borrowed requests are those of the
	// libraries' Host LMS: what the borrowed-requests grid itself shows there.
	it("asks for the libraries' patron Host LMS where the patron's agency cannot be asked for", () => {
		withAgencyScope(false);
		const query = guardQuery(exportGuard(["AB1"], [PICKUP], ["SYS1"]));
		expect(query).toBe(
			`patronHostlmsCode:"SYS1" OR supplyingAgencyCode:"AB1" OR pickupLocationCode:"${PICKUP}"`,
		);
		expect(query).not.toMatch(/patronAgencyCode/);
	});

	it("uses the patron's agency, never the Host LMS, where it can be asked for", () => {
		withAgencyScope(true);
		expect(guardQuery(exportGuard(["AB1"], [], ["SYS1"]))).not.toMatch(/patronHostlmsCode/);
	});

	it("refuses to build a guard with no library", () => {
		withAgencyScope(true);
		expect(() => exportGuard([], [PICKUP])).toThrow(ExportScopeError);
		expect(() => exportGuard(["", "  "], [])).toThrow(ExportScopeError);
	});
});

describe("guardedQuery", () => {
	it("ANDs the guard onto the grid's query, each in its own group", () => {
		withAgencyScope(true);
		const guard = exportGuard(["AB1"], []);
		expect(guardedQuery(guard, 'patronAgencyCode:AB1 AND ((status:"X"))')).toBe(
			'(patronAgencyCode:"AB1" OR supplyingAgencyCode:"AB1") AND (patronAgencyCode:AB1 AND ((status:"X")))',
		);
	});

	// A grid whose own scope is missing still cannot export outside the guard.
	it("is the guard alone when the grid has no query", () => {
		withAgencyScope(true);
		const guard = exportGuard(["AB1"], []);
		expect(guardedQuery(guard, "")).toBe(
			'(patronAgencyCode:"AB1" OR supplyingAgencyCode:"AB1")',
		);
	});
});

describe("idsQuery", () => {
	it("asks for the selected ids, and nothing that is not an id", () => {
		expect(idsQuery([PICKUP, OTHER_PICKUP, "x) OR (*"])).toBe(
			`id:"${PICKUP}" OR id:"${OTHER_PICKUP}"`,
		);
	});

	it("refuses an empty selection rather than asking for everything", () => {
		expect(() => idsQuery([])).toThrow(ExportScopeError);
		expect(() => idsQuery(["not-a-uuid"])).toThrow(ExportScopeError);
	});
});

describe("agencyLocationsQuery", () => {
	it("asks for each of the user's agencies by its exact code", () => {
		expect(agencyLocationsQuery(["AB1", 'x" OR code:"*'])).toBe(
			'code:"AB1" OR code:"x\\" OR code:\\"*"',
		);
	});
});

describe("exportGuard", () => {
	it(`refuses more than ${MAX_GUARD_LOCATIONS} locations rather than sending an unbounded query`, () => {
		withAgencyScope(true);
		const ids = Array.from(
			{ length: MAX_GUARD_LOCATIONS + 1 },
			(_, i) => `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, "0")}`,
		);
		expect(() => exportGuard(["AB1"], ids)).toThrow(ExportScopeError);
		expect(() => exportGuard(["AB1"], ids.slice(1))).not.toThrow();
	});
});

describe("isRequestInExportScope", () => {
	const guard = () => exportGuard(["AB1", "ab-2"], [PICKUP], ["SYS1"]);

	it("keeps a request borrowed by one of the user's libraries", () => {
		withAgencyScope(true);
		expect(
			isRequestInExportScope(
				{ requestingIdentity: { resolvedAgency: { code: "ab-2" } } },
				guard(),
			),
		).toBe(true);
	});

	it("keeps a request one of the user's libraries supplied", () => {
		withAgencyScope(true);
		expect(
			isRequestInExportScope(
				{ suppliers: [{ localAgency: "ZZ9" }, { localAgency: "AB1" }] },
				guard(),
			),
		).toBe(true);
	});

	it("keeps a request that matches only by its pickup location", () => {
		withAgencyScope(true);
		expect(
			isRequestInExportScope(
				{
					pickupLocationCode: PICKUP,
					requestingIdentity: { resolvedAgency: { code: "ZZ9" } },
					suppliers: [{ localAgency: "ZZ9" }],
				},
				guard(),
			),
		).toBe(true);
	});

	// Where the patron's agency can be asked for, the shared Host LMS proves nothing.
	it("drops a request that matches none", () => {
		withAgencyScope(true);
		const sharedSystemOnly = {
			pickupLocationCode: OTHER_PICKUP,
			patronHostlmsCode: "SYS1",
			requestingIdentity: { resolvedAgency: { code: "ZZ9" } },
			suppliers: [{ localAgency: "ZZ9" }],
		};
		expect(isRequestInExportScope(sharedSystemOnly, guard())).toBe(false);
	});

	it("drops a request whose fields cannot prove anything", () => {
		withAgencyScope(true);
		expect(isRequestInExportScope({}, guard())).toBe(false);
		expect(isRequestInExportScope(null, guard())).toBe(false);
		expect(
			isRequestInExportScope(
				{
					pickupLocationCode: null,
					requestingIdentity: { resolvedAgency: null },
					suppliers: [null, { localAgency: null }],
				},
				guard(),
			),
		).toBe(false);
	});

	it("matches codes exactly, as dcb-service does", () => {
		withAgencyScope(true);
		expect(
			isRequestInExportScope({ suppliers: [{ localAgency: "ab1" }] }, guard()),
		).toBe(false);
	});

	// Where the server cannot be asked about the patron's agency, the row cannot be
	// trusted to say it either: a row's patron agency then proves nothing.
	it("does not accept the patron's library where the guard could not ask for it", () => {
		withAgencyScope(false);
		expect(
			isRequestInExportScope(
				{ requestingIdentity: { resolvedAgency: { code: "AB1" } } },
				guard(),
			),
		).toBe(false);
	});

	it("keeps a request of the libraries' Host LMS on 8.71.0, as the borrowed grid does", () => {
		withAgencyScope(false);
		expect(isRequestInExportScope({ patronHostlmsCode: "SYS1" }, guard())).toBe(true);
		expect(isRequestInExportScope({ patronHostlmsCode: "SYS2" }, guard())).toBe(false);
	});
});
