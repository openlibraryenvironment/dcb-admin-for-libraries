import { describe, expect, it } from "vitest";

import enGB from "../src/locales/en-GB/en-GB.json";
import { DCBStatus } from "@constants/statuses/DCBStatuses";

// The keys are built from data, so tests/translationKeys.test.ts cannot see them.
describe("the patron request status help", () => {
	const statuses = Object.keys(DCBStatus).filter((key) => isNaN(Number(key)));
	const described = Object.keys(enGB.help.patron_request_status.values);
	const waiting = Object.keys(enGB.help.patron_request_status.waiting);

	it("describes every status", () => {
		expect(statuses.filter((status) => !described.includes(status))).toEqual([]);
	});

	it("describes no status that no longer exists", () => {
		expect(
			[...described, ...waiting].filter((status) => !statuses.includes(status)),
		).toEqual([]);
	});
});
