import { describe, expect, it } from "vitest";

import { getRequestError } from "../src/helpers/getRequestError";
import { walkUpRefusal } from "../src/helpers/walkUpRequest";
import en from "../src/locales/en-GB/en-GB.json";

/** Renders against the real English file, so a missing key or value shows up as text. */
const t = (key: string, options: Record<string, unknown> = {}): string => {
	const template = key
		.split(".")
		.reduce<unknown>(
			(node, part) =>
				node && typeof node === "object"
					? (node as Record<string, unknown>)[part]
					: undefined,
			en,
		);
	if (typeof template !== "string") return key;
	return template.replace(/{{(\w+)}}/g, (_, name) => String(options[name]));
};

describe("the message for a refused place-request", () => {
	it("says something when the refusal carries no failed checks", () => {
		for (const failedChecks of [undefined, null, []]) {
			const message = getRequestError(failedChecks, t);
			expect(message).not.toMatch(/undefined|requesting\./);
			expect(message.length).toBeGreaterThan(0);
		}
	});

	it("names the failed check when there is one", () => {
		const message = getRequestError(
			[{ code: "PATRON_BLOCKED", description: "Patron has fines" }],
			t,
		);
		expect(message).toContain("PATRON_BLOCKED");
		expect(message).toContain("Patron has fines");
	});

	it("never prints undefined for a check without a description", () => {
		expect(getRequestError([{ code: "PATRON_BLOCKED" }], t)).not.toContain(
			"undefined",
		);
	});

	it("explains a duplicate rather than quoting its code", () => {
		expect(
			getRequestError([{ code: "DUPLICATE_REQUEST_ATTEMPT" }], t),
		).not.toContain("DUPLICATE_REQUEST_ATTEMPT");
	});
});

const SUPPLIER_CANNOT_SUPPLY = [
	{
		code: "SUPPLIER_CANNOT_SUPPLY",
		description:
			"At its last check (2026-10-15T09:00:00Z) Host LMS ALTOONA refused DCB's credentials. To fix: Correct the credentials for Host LMS ALTOONA in DCB Admin, then save it so DCB checks again",
	},
];

describe("a copy whose library cannot supply it", () => {
	it("explains it to staff choosing a copy, with dcb-service's reason and remedy", () => {
		const message = getRequestError(SUPPLIER_CANNOT_SUPPLY, t);
		expect(message).toContain("The library that holds this copy cannot supply it");
		expect(message).toContain(SUPPLIER_CANNOT_SUPPLY[0].description);
		expect(message).not.toContain("SUPPLIER_CANNOT_SUPPLY");
	});

	it("tells the walk-up desk it is their own library, with the reason and remedy", () => {
		const message = walkUpRefusal(400, SUPPLIER_CANNOT_SUPPLY, t);
		expect(message).toContain("Your library cannot lend through DCB");
		expect(message).toContain(SUPPLIER_CANNOT_SUPPLY[0].description);
	});
});
