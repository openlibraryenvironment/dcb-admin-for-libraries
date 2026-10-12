import { RangePreset } from "@helpers/insightsSearch";
import { TimeSeriesInterval } from "@helpers/statsApi";

const DAYS: Record<RangePreset, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
	"365d": 365,
};

// Convert a range preset into an ISO start/end window ending now.
export function rangeToParams(preset: RangePreset): {
	startDate: string;
	endDate: string;
} {
	// Floor the window end to the current hour so the derived ISO strings - and
	// therefore the TanStack Query keys - are stable within the hour. This lets the
	// route loader's prefetch and the component's useQuery share a cache entry
	// (they compute the window independently) and avoids refetching on every render.
	const end = new Date();
	end.setMinutes(0, 0, 0);
	const start = new Date(end.getTime() - DAYS[preset] * 24 * 60 * 60 * 1000);
	return { startDate: start.toISOString(), endDate: end.toISOString() };
}

/** A `YYYY-MM-DD` day as local midnight; `new Date("2026-08-01")` is UTC midnight. */
export function localDay(date: string): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/**
 * An explicit window of calendar days, from the start of the first to the end of
 * the last in the reader's own clock, as the instants the statistics API binds.
 */
export function dayRangeToParams(range: { startDate: string; endDate: string }): {
	startDate: string;
	endDate: string;
} {
	const end = localDay(range.endDate);
	end.setHours(23, 59, 59, 999);
	return {
		startDate: localDay(range.startDate).toISOString(),
		endDate: end.toISOString(),
	};
}

// Coarser buckets for longer windows keep the flow chart legible.
export function intervalForRange(preset: RangePreset): TimeSeriesInterval {
	switch (preset) {
		case "7d":
		case "30d":
			return "day";
		case "90d":
			return "week";
		case "365d":
			return "month";
	}
}

// Bucket granularity for an arbitrary (custom) window, by its span in days.
export function intervalForSpan(
	startDate: string,
	endDate: string,
): TimeSeriesInterval {
	const days =
		(new Date(endDate).getTime() - new Date(startDate).getTime()) /
		(24 * 60 * 60 * 1000);
	if (days <= 45) return "day";
	if (days <= 180) return "week";
	return "month";
}

/**
 * The window and bucket size a view asks the statistics API for. One function,
 * because the route loader prefetches under the key the dashboard then reads.
 */
export function statsWindow(
	range: RangePreset,
	custom: { startDate: string; endDate: string } | null,
): { window: { startDate: string; endDate: string }; interval: TimeSeriesInterval } {
	if (!custom) {
		return { window: rangeToParams(range), interval: intervalForRange(range) };
	}
	const window = dayRangeToParams(custom);
	return { window, interval: intervalForSpan(window.startDate, window.endDate) };
}

// Human-readable turnaround: seconds -> "3.2 days" / "7 hrs" / "45 min".
// Takes the translator rather than building the string itself - the unit words are
// user-facing prose and must come from the locale files, not from this module.
export type Translate = (
	key: string,
	options?: Record<string, unknown>,
) => string;

export function formatTurnaround(
	seconds: number | null | undefined,
	t: Translate,
): string {
	if (!seconds || seconds <= 0) return t("insights.duration.none");
	const hours = seconds / 3600;
	if (hours >= 48)
		return t("insights.duration.days", { value: (hours / 24).toFixed(1) });
	if (hours >= 1)
		return t("insights.duration.hours", { value: hours.toFixed(1) });
	return t("insights.duration.minutes", { value: Math.round(seconds / 60) });
}
