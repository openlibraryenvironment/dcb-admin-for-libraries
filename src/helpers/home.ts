import type { GridFilterItem } from "@mui/x-data-grid-premium";
import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";
import { authHeaders } from "@helpers/auth";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { queryKeys } from "@helpers/queryKeys";
import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { getHomeCounts } from "@queries/getHomeCounts";
import { getHomeLastWeek } from "@queries/getHomeLastWeek";
import { getHomeHistory } from "@queries/getHomeHistory";
import { getHomePickupHere } from "@queries/getHomePickupHere";
import { getAgencyLocationsForExport } from "@queries/getAgencyLocationsForExport";
import { agencyLocationsQuery, quoted } from "@helpers/exportScope";

/** The grid a count belongs to; its link opens that grid with the count's filters. */
export type HomeScope = "borrowed" | "supplied";

export type HomeSection = "waiting" | "problems" | "activity";

/** What the problems and activity are counted over. */
export type HomeWindowKind = "today" | "week" | "month" | "visit";

/** "visit" carries the remembered visit it counts from; the others are measured at count time. */
export type HomeWindow =
	| { kind: Exclude<HomeWindowKind, "visit"> }
	| { kind: "visit"; since: string };

export const WINDOW_DAYS = { week: 7, month: 30 } as const;

const DAY = 24 * 3_600_000;
const WEEK = 7 * DAY;

/** Also the alias and variable names in LoadHomeCounts. */
export type HomeCountId =
	| "readyForPickup"
	| "inTransitToPickup"
	| "notYetSent"
	| "returning"
	| "failedBorrowed"
	| "failedSupplied"
	| "unfilled"
	| "placed"
	| "received";

/** A window's bounds; an open `to` runs to now. */
export interface HomeRange {
	from: string;
	to: string | null;
}

export interface HomeCount {
	id: HomeCountId;
	section: HomeSection;
	scope: HomeScope;
	/** The grid filters this count is, as the grid's own URL state carries them. */
	filters: (range: HomeRange) => GridFilterItem[];
}

const status = (value: string): GridFilterItem => ({
	id: 1,
	field: "status",
	operator: "is",
	value,
});

const anyStatus = (...values: string[]): GridFilterItem => ({
	id: 1,
	field: "status",
	operator: "isAnyOf",
	value: values,
});

const within =
	(field: "dateCreated" | "dateUpdated") =>
	({ from, to }: HomeRange): GridFilterItem => ({
		id: 2,
		field,
		operator: "luceneDateRange",
		value: [from, to],
	});

// "waiting" is the current state, so it has no window: a request ready since Friday still waits
export const HOME_COUNTS: readonly HomeCount[] = [
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
		id: "notYetSent",
		section: "waiting",
		scope: "supplied",
		// Every status before HandleSupplierInTransit sees the supplier's ILS put the item in transit
		filters: () => [
			anyStatus(
				"REQUEST_PLACED_AT_SUPPLYING_AGENCY",
				"CONFIRMED",
				"REQUEST_PLACED_AT_BORROWING_AGENCY",
				"REQUEST_PLACED_AT_PICKUP_AGENCY",
			),
		],
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

/** The counts a window applies to; also the aliases in LoadHomeLastWeek. */
export const WINDOWED_COUNTS = HOME_COUNTS.filter(
	(count) => count.section !== "waiting",
);

/** "today" is since the browser's local midnight; week and month are whole days back from now. */
export const windowStart = (window: HomeWindow, now: Date): string => {
	switch (window.kind) {
		case "today":
			return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
		case "visit":
			return window.since;
		default:
			return new Date(now.getTime() - WINDOW_DAYS[window.kind] * DAY).toISOString();
	}
};

/** A week earlier overlaps a 30-day span or a visit up to 30 days ago, so only these compare. */
export const comparesWithLastWeek = (kind: HomeWindowKind): kind is "today" | "week" =>
	kind === "today" || kind === "week";

/** The same span, one week earlier: what "the same time last week" means. */
export const lastWeekOf = (since: string, until: string): HomeRange => ({
	from: new Date(Date.parse(since) - WEEK).toISOString(),
	to: new Date(Date.parse(until) - WEEK).toISOString(),
});

/** Exactly the query the count's grid sends for the same filters, so the two agree. */
export const homeCountQuery = (
	count: HomeCount,
	range: HomeRange,
	scopes: Record<HomeScope, string>,
): string =>
	processGridFilterModel({ items: count.filters(range) }, scopes[count.scope]);

export interface HomeCounts {
	/** The window's start as counted: each link carries this, not a fresh "now". */
	since: string;
	/** When the counts were taken: the window's end, which links carry too. */
	until: string;
	/** null where the service returned no total, which is shown as unknown, never as 0. */
	counts: Record<HomeCountId, number | null>;
}

type Totals = Partial<Record<string, { totalSize?: number | null } | null>>;

const totalOf = (data: Totals, alias: string): number | null =>
	data[alias]?.totalSize ?? null;

// Count queries read the whole request table on 8.71.0: worth five minutes, and Refresh asks sooner
const HOME_STALE_TIME = 5 * 60_000;

export const homeCountsQueryOptions = (
	apiBase: string,
	scopes: Record<HomeScope, string>,
	window: HomeWindow,
) =>
	queryOptions({
		queryKey: queryKeys.home.counts(apiBase, scopes, window),
		queryFn: async (): Promise<HomeCounts> => {
			const now = new Date();
			const range = { from: windowStart(window, now), to: now.toISOString() };
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getHomeCounts,
				Object.fromEntries(
					HOME_COUNTS.map((count) => [count.id, homeCountQuery(count, range, scopes)]),
				),
				await authHeaders(),
			);
			return {
				since: range.from,
				until: now.toISOString(),
				counts: Object.fromEntries(
					HOME_COUNTS.map((count) => [count.id, totalOf(data, count.id)]),
				) as Record<HomeCountId, number | null>,
			};
		},
		staleTime: HOME_STALE_TIME,
		// Returning to the tab is not a request for nine table reads; Refresh is
		refetchOnWindowFocus: false,
		meta: OPTIONAL_QUERY,
	});

/** The windowed counts over the same span a week earlier. Keyed on the span counted. */
export const homeLastWeekQueryOptions = (
	apiBase: string,
	scopes: Record<HomeScope, string>,
	counted: Pick<HomeCounts, "since" | "until">,
) =>
	queryOptions({
		queryKey: queryKeys.home.lastWeek(apiBase, scopes, counted.since, counted.until),
		queryFn: async () => {
			const range = lastWeekOf(counted.since, counted.until);
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getHomeLastWeek,
				Object.fromEntries(
					WINDOWED_COUNTS.map((count) => [count.id, homeCountQuery(count, range, scopes)]),
				),
				await authHeaders(),
			);
			return Object.fromEntries(
				WINDOWED_COUNTS.map((count) => [count.id, totalOf(data, count.id)]),
			) as Partial<Record<HomeCountId, number | null>>;
		},
		// A week ago does not change; a new span counted is a new key
		staleTime: Infinity,
		meta: OPTIONAL_QUERY,
	});

/** Every request the library has ever borrowed and supplied: is it new to resource sharing? */
export const homeHistoryQueryOptions = (
	apiBase: string,
	scopes: Record<HomeScope, string>,
) =>
	queryOptions({
		queryKey: queryKeys.home.history(apiBase, scopes),
		queryFn: async () => {
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getHomeHistory,
				scopes,
				await authHeaders(),
			);
			return { borrowed: totalOf(data, "borrowed"), supplied: totalOf(data, "supplied") };
		},
		// A library that has borrowed or supplied never goes back to none
		staleTime: ({ state }) =>
			state.data?.borrowed || state.data?.supplied ? Infinity : HOME_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});

// An agency has tens of locations; past this the query string is the problem, not the count
export const MAX_PICKUP_LOCATIONS = 50;

const atLocations = (locationIds: readonly string[]): string =>
	`pickupLocationCode:(${locationIds.slice(0, MAX_PICKUP_LOCATIONS).map(quoted).join(" OR ")})`;

/** Requests collected at these locations whose patron is not the library's own. */
export const pickupHereQuery = (
	locationIds: readonly string[],
	borrowedScope: string,
	statusValue: string,
): string => `${atLocations(locationIds)} AND status:${statusValue} AND NOT (${borrowedScope})`;

/** Every request collected at these locations whose patron is not the library's own: Pickup requests. */
export const collectingHereQuery = (
	locationIds: readonly string[],
	borrowedScope: string,
): string => `${atLocations(locationIds)} AND NOT (${borrowedScope})`;

export const homePickupHereQueryOptions = (
	apiBase: string,
	locationIds: readonly string[],
	borrowedScope: string,
) =>
	queryOptions({
		queryKey: queryKeys.home.pickupHere(apiBase, locationIds, borrowedScope),
		queryFn: async () => {
			const data = await request<Totals>(
				`${apiBase}/graphql`,
				getHomePickupHere,
				{
					ready: pickupHereQuery(locationIds, borrowedScope, "READY_FOR_PICKUP"),
					arriving: pickupHereQuery(locationIds, borrowedScope, "PICKUP_TRANSIT"),
				},
				await authHeaders(),
			);
			return { ready: totalOf(data, "ready"), arriving: totalOf(data, "arriving") };
		},
		staleTime: HOME_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});

/** The library's own location ids, through Agency.locations as the export guard reads them. */
export const agencyLocationIdsQueryOptions = (apiBase: string, agencyCode: string) =>
	queryOptions({
		queryKey: queryKeys.home.agencyLocations(apiBase, agencyCode),
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
		staleTime: HOME_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});
