import { describe, expect, it } from "vitest";

import { formatTimestamp } from "../src/helpers/formatters";

/**
 * The same instant, on two clocks. Every timestamp in the application used to
 * be rendered on the reader's clock with no marker at all, so two colleagues in
 * different zones saw different numbers for one event and neither could tell.
 */
const INSTANT = "2026-09-01T09:15:00Z";

describe("formatTimestamp", () => {
	it("keeps ISO ordering and names the zone", () => {
		expect(formatTimestamp(INSTANT, "service")).toBe("2026-09-01 09:15 UTC");
	});

	it("says which clock it is on, whichever that is", () => {
		expect(formatTimestamp(INSTANT, "device")).toMatch(
			/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \S+$/,
		);
	});

	it("keeps millisecond precision for an audit trail", () => {
		expect(
			formatTimestamp("2026-09-01T09:15:04.250Z", "service", { precise: true }),
		).toBe("2026-09-01 09:15:04.250 UTC");
	});

	it("is a 24-hour clock, so it sorts by eye", () => {
		expect(formatTimestamp("2026-09-01T17:05:00Z", "service")).toBe(
			"2026-09-01 17:05 UTC",
		);
		expect(formatTimestamp("2026-09-01T00:05:00Z", "service")).toBe(
			"2026-09-01 00:05 UTC",
		);
	});

	/** These come straight from GraphQL, where a field can be null. */
	it("renders nothing rather than Invalid Date", () => {
		expect(formatTimestamp(null, "service")).toBe("");
		expect(formatTimestamp(undefined, "service")).toBe("");
		expect(formatTimestamp("", "service")).toBe("");
		expect(formatTimestamp("not a date", "service")).toBe("");
	});
});
