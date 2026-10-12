import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	defaultExpiry,
	endOfDay,
	toDateInputValue,
} from "../src/helpers/announcementDates";

// Node re-reads TZ when it is assigned, and vitest runs each file in its own
// process, so the zone applies to this file alone.
describe.each(["America/Chicago", "Pacific/Auckland"])(
	"announcement dates in %s",
	(zone) => {
		let previous: string | undefined;

		beforeEach(() => {
			previous = process.env.TZ;
			process.env.TZ = zone;
		});

		afterEach(() => {
			process.env.TZ = previous;
		});

		it("is actually running in that zone", () => {
			expect(new Date(2026, 0, 15).getTimezoneOffset()).not.toBe(0);
		});

		it("ends the chosen day on the administrator's clock", () => {
			const end = new Date(endOfDay("2026-09-30"));

			expect(end.getFullYear()).toBe(2026);
			expect(end.getMonth()).toBe(8);
			expect(end.getDate()).toBe(30);
			expect(end.getHours()).toBe(23);
			expect(end.getMinutes()).toBe(59);
		});

		it("defaults to a fortnight from the local day, late in the evening", () => {
			expect(defaultExpiry(new Date(2026, 8, 30, 22, 30))).toBe("2026-10-14");
		});

		it("writes the local day early in the morning", () => {
			expect(toDateInputValue(new Date(2026, 8, 30, 0, 30))).toBe("2026-09-30");
		});
	},
);
