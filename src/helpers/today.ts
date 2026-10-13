import type { GridFilterItem } from "@mui/x-data-grid-premium";
import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";
import { authHeaders } from "@helpers/auth";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { queryKeys } from "@helpers/queryKeys";
import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { getTodayCounts } from "@queries/getTodayCounts";

/** The grid a count belongs to; its link opens that grid with the count's filters. */
export type TodayScope = "borrowed" | "supplied";

export type TodaySection = "waiting" | "problems" | "activity";

export const TODAY_WINDOW_HOURS = 24;

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

export interface TodayCount {
	id: TodayCountId;
	section: TodaySection;
	scope: TodayScope;
	/** The grid filters this count is, as the grid's own URL state carries them. */
	filters: (since: string) => GridFilterItem[];
}

const status = (value: string): GridFilterItem => ({
	id: 1,
	field: "status",
	operator: "is",
	value,
});

const since =
	(field: "dateCreated" | "dateUpdated") =>
	(from: string): GridFilterItem => ({
		id: 2,
		field,
		operator: "luceneDateRange",
		value: [from, null],
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
		filters: (from) => [status("ERROR"), since("dateUpdated")(from)],
	},
	{
		id: "failedSupplied",
		section: "problems",
		scope: "supplied",
		filters: (from) => [status("ERROR"), since("dateUpdated")(from)],
	},
	{
		id: "unfilled",
		section: "problems",
		scope: "borrowed",
		filters: (from) => [
			status("NO_ITEMS_SELECTABLE_AT_ANY_AGENCY"),
			since("dateUpdated")(from),
		],
	},
	{
		id: "placed",
		section: "activity",
		scope: "borrowed",
		filters: (from) => [since("dateCreated")(from)],
	},
	{
		id: "received",
		section: "activity",
		scope: "supplied",
		filters: (from) => [since("dateCreated")(from)],
	},
];

export const windowStart = (now: Date): string =>
	new Date(now.getTime() - TODAY_WINDOW_HOURS * 3_600_000).toISOString();

/** Exactly the query the count's grid sends for the same filters, so the two agree. */
export const todayCountQuery = (
	count: TodayCount,
	from: string,
	scopes: Record<TodayScope, string>,
): string =>
	processGridFilterModel({ items: count.filters(from) }, scopes[count.scope]);

export interface TodayCounts {
	/** The window's start as counted: each link carries this, not a fresh "now". */
	since: string;
	/** null where the service returned no total, which is shown as unknown, never as 0. */
	counts: Record<TodayCountId, number | null>;
}

// Nine counts per load: worth five minutes, and the Refresh button is there for sooner
const TODAY_STALE_TIME = 5 * 60_000;

export const todayCountsQueryOptions = (
	apiBase: string,
	scopes: Record<TodayScope, string>,
) =>
	queryOptions({
		queryKey: queryKeys.today.counts(apiBase, scopes),
		queryFn: async (): Promise<TodayCounts> => {
			const from = windowStart(new Date());
			const data = await request<
				Partial<Record<TodayCountId, { totalSize?: number | null } | null>>
			>(
				`${apiBase}/graphql`,
				getTodayCounts,
				Object.fromEntries(
					TODAY_COUNTS.map((count) => [count.id, todayCountQuery(count, from, scopes)]),
				),
				await authHeaders(),
			);
			return {
				since: from,
				counts: Object.fromEntries(
					TODAY_COUNTS.map((count) => [count.id, data[count.id]?.totalSize ?? null]),
				) as Record<TodayCountId, number | null>,
			};
		},
		staleTime: TODAY_STALE_TIME,
		meta: OPTIONAL_QUERY,
	});
