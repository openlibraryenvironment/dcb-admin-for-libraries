import type { GridFilterItem } from "@mui/x-data-grid-premium";
import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";
import { authHeaders } from "@helpers/auth";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { queryKeys } from "@helpers/queryKeys";
import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { getTodayCounts } from "@queries/getTodayCounts";
import { getTodayLastWeek } from "@queries/getTodayLastWeek";
import { getTodayHistory } from "@queries/getTodayHistory";
import { getTodayPickupHere } from "@queries/getTodayPickupHere";
import { getAgencyLocationsForExport } from "@queries/getAgencyLocationsForExport";
import { agencyLocationsQuery } from "@helpers/exportScope";

/** The grid a count belongs to; its link opens that grid with the count's filters. */
export type TodayScope = "borrowed" | "supplied";

export type TodaySection = "waiting" | "problems" | "activity";

/** What the problems and activity are counted over. */
export type TodayWindowKind = "day" | "visit";

export const TODAY_WINDOW_HOURS = 24;

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

/** Also the alias and variable names in LoadTodayCounts. */
export type TodayCountId =
	| "readyForPickup"
	| "inTransitToPickup"
	| "toSupply"
	| "returning"
	| "failedBorrowed"
	| "failedSupplied"
	| "unfilled"
	| "placed"
	| "received";

/** A window's bounds; an open `to` runs to now. */
export interface TodayRange {
	from: string;
	to: string | null;
}

export interface TodayCount {
	id: TodayCountId;
	section: TodaySection;
	scope: TodayScope;
	/** The grid filters this count is, as the grid's own URL state carries them. */
	filters: (range: TodayRange) => GridFilterItem[];
}

const status = (value: string): GridFilterItem => ({
	id: 1,
	field: "status",
	operator: "is",
	value,
});

const within =
	(field: "dateCreated" | "dateUpdated") =>
	({ from, to }: TodayRange): GridFilterItem => ({
		id: 2,
		field,
		operator: "luceneDateRange",
		value: [from, to],
	});

// "waiting" is the current state, so it has no window: a request ready since Friday still waits
export const TODAY_COUNTS: readonly TodayCount[] = [
	{
		id: "readyForPickup",
		section: "waiting",
		scope: "borrowed",
		filters: () => [status("READY_FOR_PICKUP")],
	},
	{
		id: "inTransitToPickup",
		section: "waiting",
		scope: "borrowed",
		filters: () => [status("PICKUP_TRANSIT")],
	},
	{
		id: "toSupply",
		section: "waiting",
		scope: "supplied",
		filters: () => [status("REQUEST_PLACED_AT_SUPPLYING_AGENCY")],
	},
	{
		id: "returning",
		section: "waiting",
		scope: "supplied",
		filters: () => [status("RETURN_TRANSIT")],
	},
	{
		id: "failedBorrowed",
		section: "problems",
		scope: "borrowed",
		filters: (range) => [status("ERROR"), within("dateUpdated")(range)],
	},
	{
		id: "failedSupplied",
		section: "problems",
		scope: "supplied",
		filters: (range) => [status("ERROR"), within("dateUpdated")(range)],
	},
	{
		id: "unfilled",
		section: "problems",
		scope: "borrowed",
		filters: (range) => [
			status("NO_ITEMS_SELECTABLE_AT_ANY_AGENCY"),
			within("dateUpdated")(range),
		],
	},
	{
		id: "placed",
		section: "activity",
		scope: "borrowed",
		filters: (range) => [within("dateCreated")(range)],
	},
	{
		id: "received",
		section: "activity",
		scope: "supplied",
		filters: (range) => [within("dateCreated")(range)],
	},
];

/** The counts a window applies to; also the aliases in LoadTodayLastWeek. */
export const WINDOWED_COUNTS = TODAY_COUNTS.filter(
	(count) => count.section !== "waiting",
);

export const windowStart = (now: Date): string =>
	new Date(now.getTime() - TODAY_WINDOW_HOURS * HOUR).toISOString();

/** The same span, one week earlier: what "the same time last week" means. */
export const lastWeekOf = (since: string, until: string): TodayRange => ({
	from: new Date(Date.parse(since) - WEEK).toISOString(),
	to: new Date(Date.parse(until) - WEEK).toISOString(),
});

/** Exactly the query the count's grid sends for the same filters, so the two agree. */
export const todayCountQuery = (
	count: TodayCount,
	range: TodayRange,
	scopes: Record<TodayScope, string>,
): string =>
	processGridFilterModel({ items: count.filters(range) }, scopes[count.scope]);

export interface TodayCounts {
	/** The window's start as counted: each link carries this, not a fresh "now". */
	since: string;
	/** When the counts were taken; a comparison ends here, one week back. */
	until: string;
	/** null where the service returned no total, which is shown as unknown, never as 0. */
	counts: Record<TodayCountId, number | null>;
}

type Totals = Partial<Record<string, { totalSize?: number | null } | null>>;

const totalOf = (data: Totals, alias: string): number | null =>
	data[alias]?.totalSize ?? null;

// Nine counts per load: worth five minutes, and the Refresh button is there for sooner
const TODAY_STALE_TIME = 5 * 60_000;

/** `since` null is the last 24 hours, measured when the counts are taken. */
export const todayCountsQueryOptions = (
	apiBase: string,
	scopes: Record<TodayScope, string>,
	since: string | null,
) =>
	queryOptions({
		queryKey: queryKeys.today.counts(apiBase, scopes, since),
		queryFn: async (): Promise<TodayCounts> => {
			const now = new Date();
			const range = { from: since ?? windowStart(now), to: null };
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getTodayCounts,
				Object.fromEntries(
					TODAY_COUNTS.map((count) => [count.id, todayCountQuery(count, range, scopes)]),
				),
				await authHeaders(),
			);
			return {
				since: range.from,
				until: now.toISOString(),
				counts: Object.fromEntries(
					TODAY_COUNTS.map((count) => [count.id, totalOf(data, count.id)]),
				) as Record<TodayCountId, number | null>,
			};
		},
		staleTime: TODAY_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});

/** The windowed counts over the same span a week earlier. Keyed on the span counted. */
export const todayLastWeekQueryOptions = (
	apiBase: string,
	scopes: Record<TodayScope, string>,
	counted: Pick<TodayCounts, "since" | "until">,
) =>
	queryOptions({
		queryKey: queryKeys.today.lastWeek(apiBase, scopes, counted.since, counted.until),
		queryFn: async () => {
			const range = lastWeekOf(counted.since, counted.until);
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getTodayLastWeek,
				Object.fromEntries(
					WINDOWED_COUNTS.map((count) => [count.id, todayCountQuery(count, range, scopes)]),
				),
				await authHeaders(),
			);
			return Object.fromEntries(
				WINDOWED_COUNTS.map((count) => [count.id, totalOf(data, count.id)]),
			) as Partial<Record<TodayCountId, number | null>>;
		},
		// A week ago does not change
		staleTime: Infinity,
		meta: OPTIONAL_QUERY,
	});

/** Every request the library has ever borrowed and supplied: is it new to resource sharing? */
export const todayHistoryQueryOptions = (
	apiBase: string,
	scopes: Record<TodayScope, string>,
) =>
	queryOptions({
		queryKey: queryKeys.today.history(apiBase, scopes),
		queryFn: async () => {
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getTodayHistory,
				scopes,
				await authHeaders(),
			);
			return { borrowed: totalOf(data, "borrowed"), supplied: totalOf(data, "supplied") };
		},
		staleTime: TODAY_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});

// An agency has tens of locations; past this the query string is the problem, not the count
export const MAX_PICKUP_LOCATIONS = 50;

/** Requests collected at these locations whose patron is not the library's own. */
export const pickupHereQuery = (
	locationIds: readonly string[],
	borrowedScope: string,
	statusValue: string,
): string => {
	const ids = locationIds
		.slice(0, MAX_PICKUP_LOCATIONS)
		.map((id) => `"${id.replace(/["\\]/g, "\\$&")}"`)
		.join(" OR ");
	return `pickupLocationCode:(${ids}) AND status:${statusValue} AND NOT (${borrowedScope})`;
};

export const todayPickupHereQueryOptions = (
	apiBase: string,
	locationIds: readonly string[],
	borrowedScope: string,
) =>
	queryOptions({
		queryKey: queryKeys.today.pickupHere(apiBase, locationIds, borrowedScope),
		queryFn: async () => {
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getTodayPickupHere,
				{
					ready: pickupHereQuery(locationIds, borrowedScope, "READY_FOR_PICKUP"),
					arriving: pickupHereQuery(locationIds, borrowedScope, "PICKUP_TRANSIT"),
				},
				await authHeaders(),
			);
			return { ready: totalOf(data, "ready"), arriving: totalOf(data, "arriving") };
		},
		staleTime: TODAY_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});

/** The library's own location ids, through Agency.locations as the export guard reads them. */
export const agencyLocationIdsQueryOptions = (apiBase: string, agencyCode: string) =>
	queryOptions({
		queryKey: queryKeys.today.agencyLocations(apiBase, agencyCode),
		queryFn: async () => {
			const data = await request<{
				agencies?: {
					content?: ({ code?: string; locations?: ({ id?: string } | null)[] } | null)[];
				};
			}>(
				`${apiBase}/graphql`,
				getAgencyLocationsForExport,
				{ query: agencyLocationsQuery([agencyCode]), pageno: 0, pagesize: 1 },
				await authHeaders(),
			);
			return (data.agencies?.content ?? [])
				.filter((agency) => agency?.code === agencyCode)
				.flatMap((agency) => agency?.locations ?? [])
				.map((location) => location?.id)
				.filter((id): id is string => !!id);
		},
		staleTime: TODAY_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});
