import { z } from "zod/mini";

/**
 * The six subjects, the same six as DCB Admin, in reading order: what is happening, how
 * well it went, what was asked for, who with, what we hold, what we are missing. Here
 * rather than in insightsSubjects, because route options load this eagerly and that
 * module reads the panel flags.
 */
export const SUBJECTS = [
	"trends",
	"service",
	"demand",
	"partners",
	"collection",
	"gaps",
] as const;

export type Subject = (typeof SUBJECTS)[number];

/**
 * The whole Insights view, in the URL.
 *
 * Every field `.catch()`es to its default, so a truncated or hand-edited link degrades to a
 * view rather than throwing a route error at somebody who mistyped a date. What each field
 * is for is stated beside it.
 */

export const RANGE_PRESETS = ["7d", "30d", "90d", "365d"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const DEFAULT_RANGE: RangePreset = "30d";

/** The statuses that tell the "is it working" story, and the cap on how many may plot. */
export const DEFAULT_SERIES = [
	"LOANED",
	"REQUEST_PLACED_AT_SUPPLYING_AGENCY",
	"ERROR",
];

/** Beyond eight categorical series a chart invents hues nobody can tell apart. */
export const MAX_PLOT_SERIES = 8;

const csv = <T>(parse: (value: string) => T | null) =>
	z.pipe(
		z.string(),
		z.transform((value: string) =>
			value
				.split(",")
				.map((part) => part.trim())
				.map(parse)
				.filter((part): part is T => part !== null),
		),
	);

export const insightsSearchSchema = z.object({
	// Which subject is open. A name this app does not offer - an old link, a link copied
	// from DCB Admin, which has a sixth - falls back rather than rendering nothing.
	tab: z.catch(z.optional(z.enum(SUBJECTS)), undefined),
	range: z.catch(z.optional(z.enum(RANGE_PRESETS)), undefined),
	// Only meaningful together, and only when the reader chose an explicit window.
	from: z.catch(z.optional(z.iso.date()), undefined),
	to: z.catch(z.optional(z.iso.date()), undefined),
	series: z.catch(
		z.optional(csv((part) => (/^[A-Z_]+$/.test(part) ? part : null))),
		undefined,
	),
	// The reader's own assumption, in the link, so a figure shared into a board pack
	// carries the number it was computed with rather than whatever the recipient last
	// typed. Negative and absurd values fall back rather than producing a negative saving.
	unitCost: z.catch(
		z.optional(z.coerce.number().check(z.minimum(0), z.maximum(10_000))),
		undefined,
	),
});

export type InsightsSearch = z.infer<typeof insightsSearchSchema>;

/** The view a bare `/insights` shows, so callers never have to spell the defaults out. */
export function resolveSearch(search: InsightsSearch) {
	// Calendar days, inclusive. A window that ends before it starts is not one.
	const custom =
		search.from && search.to && search.from <= search.to
			? { startDate: search.from, endDate: search.to }
			: null;

	return {
		tab: search.tab,
		// An explicit window wins over a preset, and clearing it falls back to one.
		range: search.range ?? DEFAULT_RANGE,
		custom,
		series:
			search.series && search.series.length > 0
				? search.series.slice(0, MAX_PLOT_SERIES)
				: DEFAULT_SERIES,
		unitCost: search.unitCost ?? null,
	};
}
