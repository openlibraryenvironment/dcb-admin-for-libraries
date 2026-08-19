import { describe, it, expect } from "vitest";
import {
	rangeToParams,
	intervalForRange,
	formatTurnaround,
} from "@helpers/insightsRange";

describe("intervalForRange", () => {
	it("uses coarser buckets for longer windows", () => {
		expect(intervalForRange("7d")).toBe("day");
		expect(intervalForRange("30d")).toBe("day");
		expect(intervalForRange("90d")).toBe("week");
		expect(intervalForRange("365d")).toBe("month");
	});
});

describe("rangeToParams", () => {
	it("spans the requested number of days", () => {
		const { startDate, endDate } = rangeToParams("30d");
		const days =
			(new Date(endDate).getTime() - new Date(startDate).getTime()) /
			(24 * 60 * 60 * 1000);
		expect(days).toBe(30);
	});

	it("floors the window end to the hour so query keys are stable", () => {
		const { endDate } = rangeToParams("7d");
		const end = new Date(endDate);
		expect(end.getMinutes()).toBe(0);
		expect(end.getSeconds()).toBe(0);
		expect(end.getMilliseconds()).toBe(0);
	});
});

describe("formatTurnaround", () => {
	// Stand-in for i18next's t: echoes the key and the interpolated value, so the
	// assertions pin WHICH key is chosen for a magnitude without coupling to the
	// English wording in the locale files.
	const t = (key: string, options?: Record<string, unknown>) =>
		options?.value === undefined ? key : `${key}:${options.value}`;

	it("uses the empty-value key for missing / non-positive input", () => {
		expect(formatTurnaround(0, t)).toBe("insights.duration.none");
		expect(formatTurnaround(null, t)).toBe("insights.duration.none");
		expect(formatTurnaround(undefined, t)).toBe("insights.duration.none");
	});

	it("scales the unit to the magnitude", () => {
		expect(formatTurnaround(300, t)).toBe("insights.duration.minutes:5");
		expect(formatTurnaround(3600, t)).toBe("insights.duration.hours:1.0");
		expect(formatTurnaround(172800, t)).toBe("insights.duration.days:2.0");
	});

	it("takes every unit word from the translator, never from the module", () => {
		// The regression this guards: a hardcoded "days" / "hrs" / "min" in the
		// helper ships an untranslatable string to every non-English tenant.
		const spanish = (key: string, options?: Record<string, unknown>) =>
			({
				"insights.duration.days": `${options?.value} días`,
				"insights.duration.hours": `${options?.value} h`,
				"insights.duration.minutes": `${options?.value} min`,
				"insights.duration.none": "—",
			})[key] ?? key;

		expect(formatTurnaround(172800, spanish)).toBe("2.0 días");
		expect(formatTurnaround(7200, spanish)).toBe("2.0 h");
	});
});
