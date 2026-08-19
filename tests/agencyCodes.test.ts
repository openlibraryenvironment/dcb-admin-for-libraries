import { describe, it, expect } from "vitest";
import {
	agencyCodesFrom,
	resolveAgencyCode,
} from "../src/hooks/useAgencyCodes";

/**
 * The `code` claim used to be read as a scalar everywhere. It is a list now, because
 * one person can be responsible for several libraries - whoever administers a shared
 * Koha on behalf of some of its tenants is not a consortium administrator and must
 * not be made one, but neither do they belong to exactly one library.
 *
 * Almost every deployment issues a single value, so the single case has to stay
 * exactly as cheap as it was.
 */
describe("agencyCodesFrom", () => {
	it("reads the ordinary single-library claim", () => {
		expect(agencyCodesFrom("springfield")).toEqual(["springfield"]);
	});

	it("reads a claim issued as a list", () => {
		expect(agencyCodesFrom(["springfield", "shelbyville"])).toEqual([
			"springfield",
			"shelbyville",
		]);
	});

	it("reads a claim issued as one comma-separated value", () => {
		// How some identity providers express a multi-valued attribute
		expect(agencyCodesFrom("springfield, shelbyville ,ogdenville")).toEqual([
			"springfield",
			"shelbyville",
			"ogdenville",
		]);
	});

	it("returns nothing for an absent claim rather than a phantom library", () => {
		expect(agencyCodesFrom(undefined)).toEqual([]);
		expect(agencyCodesFrom(null)).toEqual([]);
		expect(agencyCodesFrom("")).toEqual([]);
		expect(agencyCodesFrom([])).toEqual([]);
	});

	it("drops blanks so a trailing separator does not become a library", () => {
		expect(agencyCodesFrom("springfield,,")).toEqual(["springfield"]);
		expect(agencyCodesFrom(["springfield", "  "])).toEqual(["springfield"]);
	});
});

/**
 * The stored selection is a convenience, never an authority. Everything scoped by it -
 * every grid, every count, the home page and the request forms - is scoped to whatever
 * this returns, so a value the claim no longer contains must not survive.
 */
describe("resolveAgencyCode", () => {
	it("honours a stored choice that is still the user's", () => {
		expect(
			resolveAgencyCode(["springfield", "shelbyville"], "shelbyville"),
		).toBe("shelbyville");
	});

	it("ignores a stored choice the claim no longer names", () => {
		// Their access was revoked between sessions. Falling back is a library they can
		// see; honouring the stored value is a library they cannot, and every query made
		// under it would be refused rather than empty.
		expect(resolveAgencyCode(["springfield"], "ogdenville")).toBe("springfield");
	});

	it("falls back to the first library when nothing is stored", () => {
		expect(resolveAgencyCode(["springfield", "shelbyville"], null)).toBe(
			"springfield",
		);
	});

	it("has no answer when the claim names no library", () => {
		expect(resolveAgencyCode([], "springfield")).toBeUndefined();
		expect(resolveAgencyCode([], null)).toBeUndefined();
	});
});
