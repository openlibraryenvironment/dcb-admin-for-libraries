import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { AxiosInstance } from "axios";
import type { QueryFunctionContext } from "@tanstack/react-query";

// --- Response types (mirror org.olf.dcb.core.api.serde.*) -------------------

export interface TimeSeriesPoint {
	bucket: string; // ISO instant of the bucket start
	series: string; // the DCB status transitioned into
	count: number;
}

/**
 * One bucket of a percentile trend.
 *
 * An empty bucket is ABSENT rather than zero, unlike the flow series where a zero count is
 * a fact: a bucket with no observations has no median, and a zero would read as instant.
 * `sampleCount` is how far the bucket can be trusted.
 */
export interface TrendPoint {
	bucket: string;
	p50Seconds: number | null;
	p95Seconds: number | null;
	sampleCount: number | null;
}

/** The durations `/insights/trend` will plot, as the fixed vocabulary the service owns. */
export const TREND_METRICS = [
	"TURNAROUND_TO_STATUS",
	"SUPPLIER_RESPONSE",
	"STATUS_DWELL",
] as const;

export type TrendMetric = (typeof TREND_METRICS)[number];

export interface TurnaroundStat {
	p50Seconds: number;
	p95Seconds: number;
}

export interface PartnerStat {
	partnerCode: string;
	// Null when the Host LMS has traffic but is not onboarded as a library - fall back to the
	// code rather than rendering a blank, as PeerBenchmarkPanel does for libraryName.
	partnerName: string | null;
	requestCount: number;
}

/**
 * One partner and the traffic in BOTH directions, ranked on the total. Not derivable from
 * topSuppliers and topBorrowers: a partner sixth in each can out-total one third in one, and
 * appears in neither. The split is kept so an uneven relationship stays visible.
 */
export interface TradingPartnerStat {
	partnerCode: string;
	partnerName: string | null;
	borrowedFromCount: number;
	suppliedToCount: number;
	totalCount: number;
}

export interface DashboardMetrics {
	turnaroundToLoaned: TurnaroundStat;
	turnaroundToFinalised: TurnaroundStat;
	topSuppliers: PartnerStat[];
	topBorrowers: PartnerStat[];
}

export interface FailureReasonStat {
	reason: string;
	count: number;
}

export interface SupplierReliabilityStat {
	supplierCode: string;
	fulfilledCount: number;
	failedCount: number;
}

export interface NetFlowStat {
	libraryCode: string;
	borrowedCount: number;
	suppliedCount: number;
}

export interface FulfillmentStat {
	successfulCount: number;
	failedCount: number;
}

// "Rare gem": clusters this library is the ONLY contributor to, that the network
// requested - the unique collection value it brings to the consortium.
export interface RareGem {
	clusterId: string;
	title: string;
	author: string;
	localBibId: string;
	supplyCount: number;
}

export interface StatusDwellStat {
	status: string;
	medianDwellSeconds: number;
	sampleCount: number;
}

export interface SupplierResponseStat {
	supplierCode: string;
	medianResponseSeconds: number;
	sampleCount: number;
}

export interface DemandHeatCell {
	dayOfWeek: number; // 0 = Sunday .. 6 = Saturday (Postgres DOW)
	hourOfDay: number; // 0 .. 23
	requestCount: number;
}

export interface CheckoutRateStat {
	reachedCount: number;
	totalCount: number;
}

export interface CollectionBalanceStat {
	borrowedCount: number;
	suppliedCount: number;
	netBalance?: number;
}

// One round-trip for the whole KPI header (see /stats/dashboard).
export interface DashboardSummary {
	fulfillmentCurrent: FulfillmentStat;
	fulfillmentPrior: FulfillmentStat;
	turnaroundToLoaned: TurnaroundStat;
	checkoutRate: CheckoutRateStat;
	lendBorrowTotals: CollectionBalanceStat;
	savedByReResolution: number;
	collectionSummary: CollectionSummaryStat;
}

export interface FormatDemandStat {
	format: string;
	requestCount: number;
}

export interface CollectionSummaryStat {
	uniqueTitlesRequested: number;
	totalRequests: number;
}

// Shapes for the previously-unsurfaced endpoints.
export interface RequestedTitleStat {
	title: string;
	requestCount: number;
	/** Absent before dcb-service carried it. */
	clusterId?: string;
}
export interface PickupLocationDemandStat {
	pickupLocationCode: string;
	pickupLocationName: string;
	requestCount: number;
}
export interface PatronGroupDemandStat {
	patronGroup: string;
	requestCount: number;
}
export interface TopClusterStat {
	clusterId: string;
	title: string;
	requestCount: number;
}
export interface ConsortialLifelineStat {
	clusterId: string;
	title: string;
	author: string;
	isbn: string;
	localBibId: string;
	supplyCount: number;
}

/**
 * One library's volume split by whether a van moved.
 *
 * The two counts are written by dcb-service to sum to totalRequests, so the UI never has to
 * decide what an unset expedited-checkout flag means.
 */
export interface LibraryBreakdownStat {
	libraryCode: string;
	// Null when no library row maps to that Host LMS - a system with requests that is
	// not onboarded. Callers show the code rather than a blank row.
	libraryName: string | null;
	totalRequests: number;
	// Collected in person at the supplying library. No van moved.
	walkUpRequests: number;
	// Sent to the reader's own library for collection.
	shippedRequests: number;
}

export interface PeerBenchmarkStat {
	libraryCode: string;
	// The name a librarian recognises. Null when no library row maps to that Host
	// LMS - a system with requests that is not onboarded as a library - so callers
	// fall back to the code rather than rendering a blank row.
	libraryName: string | null;
	totalRequests: number;
	checkoutCount: number;
	successCount: number;
	failedCount: number;
}

export interface DimensionDemandStat {
	category: string;
	requestCount: number;
}

export type CollectionDimension = "format" | "language" | "subject" | "decade";

export interface NewAcquisitionPerformanceStat {
	clusterId: string;
	title: string;
	author: string;
	localBibId: string;
	dateAdded: string;
	supplyCount: number;
}

// --- Params ------------------------------------------------------------------

export interface StatsParams {
	// Omitted (undefined) means consortium-wide. Present means a single library
	// (a Host LMS code, matching patron_hostlms_code / local_item_hostlms_code).
	libraryCode?: string;
	startDate?: string; // ISO instant
	endDate?: string; // ISO instant
}

/**
 * Demand nothing in the consortium could satisfy: titles requested where no library
 * holds a bib record. Distinct from the failure taxonomy, which says why requests that
 * had a supplier still failed - this is demand with no supplier to begin with.
 */
export interface UnfillableDemandStat {
	clusterId: string;
	title: string;
	author: string;
	requestCount: number;
}

// --- Collection analysis ------------------------------------------------------
// These aggregate bib_record - the catalogue as INGESTED - rather than patron_request,
// so they take no date window and report on what the consortium holds rather than on
// what it has been asked for. See docs/insights.md part 5 in dcb-service.

/** The consortium in four numbers. Only as good as the clustering - read with ClusterSizeStat. */
export interface CollectionTotalsStat {
	distinctTitles: number;
	singlyHeldTitles: number;
	holdings: number;
	contributingSources: number;
}

export interface CollectionProfileStat {
	sourceSystemId: string;
	// Host LMS code - the stable identifier, not display text.
	sourceSystemCode: string;
	clusterCount: number;
	uniqueTitleCount: number;
}

// This library (left) and one other holder of its works (right). One row per peer; never
// the full matrix.
export interface CollectionOverlapStat {
	leftSystemId: string;
	leftSystemCode: string;
	rightSystemId: string;
	rightSystemCode: string;
	sharedTitleCount: number;
}

/**
 * How many source systems hold each work. The confidence signal for every other
 * collection number: a corpus that is overwhelmingly holderCount = 1 is under-clustered,
 * and the unique-title counts are then fiction. Never render the others without it.
 */
export interface ClusterSizeStat {
	holderCount: number;
	clusterCount: number;
}

export interface SourceFormatStat {
	sourceSystemId: string;
	sourceSystemCode: string;
	// Nullable: derived_type has no NOT NULL, and an ingest that could not derive one
	// produces a null. Reported rather than dropped, so the totals still add up.
	derivedType: string | null;
	titleCount: number;
}

export type TimeSeriesInterval = "day" | "week" | "month";

// dcb-service serves Insights from /insights. It was /patrons/requests/stats, which was
// accurate when the surface was ten endpoints on the patron request controller and misleading
// at thirty-five - half of them never read patron_request at all. Requires a dcb-service
// carrying the rename; VITE_FEATURE_INSIGHTS gates that, see featureFlags.
const STATS_BASE = "/insights";

/**
 * The wire name for the library filter. dcb-service binds
 * `requestedLibraryCode`, and sending `libraryCode` is SILENTLY wrong - the
 * endpoint ignores it and falls back to the token.
 * docs/service-compatibility.md.
 */
export const LIBRARY_CODE_PARAM = "requestedLibraryCode";

// Strip undefined so axios does not serialise `libraryCode=undefined` etc., and rename the
// library filter to the name the API actually binds.
function cleanParams<T extends object>(params: T): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(params)
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([k, v]) => [k === "libraryCode" ? LIBRARY_CODE_PARAM : k, v]),
	);
}

// --- TanStack Query options factories ---------------------------------------
// Shared by route loaders (queryClient.ensureQueryData) and components (useQuery)
// so the query keys can never drift between prefetch and read.

export function timeSeriesQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
	interval: TimeSeriesInterval,
) {
	return {
		queryKey: ["stats", "timeseries", interval, params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<TimeSeriesPoint[]> => {
			const { data } = await client.get(`${STATS_BASE}/timeseries`, {
				params: cleanParams({ interval, ...params }),
				signal,
			});
			return data;
		},
	};
}

export function dashboardMetricsQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "dashboard-metrics", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<DashboardMetrics> => {
			const { data } = await client.get(`${STATS_BASE}/dashboard-metrics`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

/** The fields of a Micronaut Page this app actually reads. */
export interface Paged<T> {
	content: T[];
	totalSize: number;
}

/**
 * Returns the PAGE rather than unwrapping to the first row: the reason for this
 * endpoint over dashboard-metrics' fixed top ten is that the tail is reachable.
 * `libraryCode` is required, and sorting is optional. docs/insights.md.
 */
export function topPartnersQueryOptions(
	client: AxiosInstance,
	params: StatsParams & {
		libraryCode: string;
		page?: number;
		size?: number;
		sort?: string;
	},
) {
	return {
		queryKey: ["stats", "top-partners", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<Paged<TradingPartnerStat>> => {
			const { data } = await client.get(`${STATS_BASE}/top-partners`, {
				params: cleanParams(params),
				signal,
			});
			return { content: data?.content ?? [], totalSize: data?.totalSize ?? 0 };
		},
	};
}

export function failureTaxonomyQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "failure-taxonomy", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<FailureReasonStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/failure-taxonomy`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function supplierReliabilityQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "supplier-reliability", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<SupplierReliabilityStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/supplier-reliability`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function netFlowQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "net-flow", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<NetFlowStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/net-flow`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function borrowerFulfillmentQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "fulfillment", "borrower", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<FulfillmentStat> => {
			const { data } = await client.get(`${STATS_BASE}/fulfillment/borrower`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// libraryCode is REQUIRED by this endpoint (unique-to-one-library is meaningless
// consortium-wide), so this is only used on the per-library page.
export function uniqueContributionsQueryOptions(
	client: AxiosInstance,
	params: StatsParams & { libraryCode: string },
) {
	return {
		queryKey: ["stats", "unique-contributions", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<RareGem[]> => {
			const { data } = await client.get(`${STATS_BASE}/unique-contributions`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function timeInStatusQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "time-in-status", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<StatusDwellStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/time-in-status`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function supplierResponseSlaQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "supplier-response-sla", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<SupplierResponseStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/supplier-response-sla`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function demandHeatmapQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "demand-heatmap", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<DemandHeatCell[]> => {
			const { data } = await client.get(`${STATS_BASE}/demand-heatmap`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// Combined KPI header - one request instead of ~7.
/**
 * A percentile over time, from `/insights/trend`.
 *
 * `metric` is an id from the service's own vocabulary, never a column name and never
 * caller text - the endpoint rejects an unknown one rather than defaulting, so a typo is
 * an error and not a chart that is quietly empty.
 */
export function trendQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
	interval: TimeSeriesInterval,
	metric: TrendMetric,
	extra?: { targetStatus?: string; status?: string },
) {
	return {
		queryKey: ["stats", "trend", metric, interval, params, extra ?? null] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<TrendPoint[]> => {
			const { data } = await client.get(`${STATS_BASE}/trend`, {
				params: cleanParams({ metric, interval, ...extra, ...params }),
				signal,
			});
			return data;
		},
	};
}

export function dashboardQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "dashboard", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<DashboardSummary> => {
			const { data } = await client.get(`${STATS_BASE}/dashboard`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function checkoutRateQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "checkout-rate", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<CheckoutRateStat> => {
			const { data } = await client.get(`${STATS_BASE}/checkout-rate`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function collectionSummaryQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "collection-summary", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<CollectionSummaryStat> => {
			const { data } = await client.get(`${STATS_BASE}/collection-summary`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function demandByFormatQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "demand-by-format", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<FormatDemandStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/demand-by-format`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function demandByPickupLocationQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "demand-by-pickup-location", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<PickupLocationDemandStat[]> => {
			const { data } = await client.get(
				`${STATS_BASE}/demand-by-pickup-location`,
				{ params: cleanParams(params), signal },
			);
			return data;
		},
	};
}

export function demandByPatronGroupQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "demand-by-patron-group", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<PatronGroupDemandStat[]> => {
			const { data } = await client.get(
				`${STATS_BASE}/demand-by-patron-group`,
				{
					params: cleanParams(params),
					signal,
				},
			);
			return data;
		},
	};
}

// This endpoint is paginated (Micronaut Page); we surface the first page only.
export function topRequestedTitlesQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "top-requested-titles", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<RequestedTitleStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/top-requested-titles`, {
				params: cleanParams({ ...params, size: 20 }),
				signal,
			});
			return data?.content ?? [];
		},
	};
}

export function savedByReResolutionQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "saved-by-re-resolution", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<number> => {
			const { data } = await client.get(
				`${STATS_BASE}/saved-by-re-resolution`,
				{
					params: cleanParams(params),
					signal,
				},
			);
			return data;
		},
	};
}

// The following require a libraryCode (NotNull on the endpoint) - library scope only.
export function unmetLocalDemandQueryOptions(
	client: AxiosInstance,
	params: StatsParams & { libraryCode: string },
) {
	return {
		queryKey: ["stats", "unmet-local-demand", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<TopClusterStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/unmet-local-demand`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function acquisitionOpportunitiesQueryOptions(
	client: AxiosInstance,
	params: StatsParams & { libraryCode: string },
) {
	return {
		queryKey: ["stats", "acquisition-opportunities", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<TopClusterStat[]> => {
			const { data } = await client.get(
				`${STATS_BASE}/acquisition-opportunities`,
				{ params: cleanParams(params), signal },
			);
			return data;
		},
	};
}

export function consortialLifelineQueryOptions(
	client: AxiosInstance,
	params: StatsParams & { libraryCode: string },
) {
	return {
		queryKey: ["stats", "consortial-lifeline", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<ConsortialLifelineStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/consortial-lifeline`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// SCOPED, unlike peer benchmarks below. This answers "what did MY library do" and takes the
// same library filter every other stats call does, so a library administrator sees one row.
export function libraryBreakdownQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "library-breakdown", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<LibraryBreakdownStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/library-breakdown`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// Peer benchmarks are consortium-wide (every library's figures) regardless of scope,
// so the UI can rank the selected library against the network. No libraryCode param.
export function peerBenchmarksQueryOptions(
	client: AxiosInstance,
	params: { startDate?: string; endDate?: string },
) {
	return {
		queryKey: ["stats", "peer-benchmarks", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<PeerBenchmarkStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/peer-benchmarks`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

export function demandByDimensionQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
	dimension: CollectionDimension,
) {
	return {
		queryKey: ["stats", "demand-by-dimension", dimension, params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<DimensionDemandStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/demand-by-dimension`, {
				params: cleanParams({ dimension, ...params }),
				signal,
			});
			return data;
		},
	};
}

// Turnaround for a library, the consortium, or a COMBINATION (comma-separated codes).
export function turnaroundQueryOptions(
	client: AxiosInstance,
	params: {
		libraryCodes?: string;
		targetStatus?: string;
		startDate?: string;
		endDate?: string;
	},
) {
	return {
		queryKey: ["stats", "turnaround", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<TurnaroundStat> => {
			const { data } = await client.get(`${STATS_BASE}/turnaround`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// Requires libraryCode + acquiredSince (both NotNull on the endpoint) - library scope.
export function newAcquisitionsQueryOptions(
	client: AxiosInstance,
	params: StatsParams & { libraryCode: string; acquiredSince: string },
) {
	return {
		queryKey: ["stats", "new-acquisitions-performance", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<NewAcquisitionPerformanceStat[]> => {
			const { data } = await client.get(
				`${STATS_BASE}/new-acquisitions-performance`,
				{ params: cleanParams(params), signal },
			);
			return data;
		},
	};
}

export function unfillableDemandQueryOptions(
	client: AxiosInstance,
	params: StatsParams,
) {
	return {
		queryKey: ["stats", "unfillable-demand", params] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<UnfillableDemandStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/unfillable-demand`, {
				params: cleanParams(params),
				signal,
			});
			return data;
		},
	};
}

// --- Collection analysis ------------------------------------------------------
// The four consortium-wide queries take no parameters, not even the date window: they count
// the catalogue, not traffic over it, so their keys are constant and the range picker cannot
// refetch them. staleTime matches dcb-service's 15-minute cache. They retry only while the
// count is still running: dcb-service keeps a shared pass going when a caller leaves, so a
// retry joins it, where any other failure would only repeat.
const COLLECTION_ANALYSIS_STALE_MS = 15 * 60 * 1000;
const STILL_COMPUTING_RETRIES = 3;

/**
 * An answer that means "the count is still running", not "it failed": a 502 or 504 from the
 * proxy in front of dcb-service, whose pass outlived the proxy and carries on, or the 429 a
 * dcb-service from before shared computation gave when its single permit was taken.
 */
const STILL_COMPUTING_STATUSES = new Set([429, 502, 504]);

export function isStillComputing(error: unknown): boolean {
	const status =
		typeof error === "object" && error !== null
			? (error as { response?: { status?: number } }).response?.status
			: undefined;
	return status !== undefined && STILL_COMPUTING_STATUSES.has(status);
}

export const collectionAnalysisPolicy = {
	staleTime: COLLECTION_ANALYSIS_STALE_MS,
	retry: (failureCount: number, error: unknown) =>
		isStillComputing(error) && failureCount < STILL_COMPUTING_RETRIES,
	retryDelay: (failureCount: number) =>
		Math.min(20_000 * 2 ** failureCount, 60_000),
};

export function collectionTotalsQueryOptions(client: AxiosInstance) {
	return {
		...collectionAnalysisPolicy,
		queryKey: ["stats", "collection-totals"] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<CollectionTotalsStat> => {
			const { data } = await client.get(`${STATS_BASE}/collection-totals`, { signal });
			return data;
		},
	};
}

export function collectionProfileQueryOptions(client: AxiosInstance) {
	return {
		...collectionAnalysisPolicy,
		queryKey: ["stats", "collection-profile"] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<CollectionProfileStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/collection-profile`, { signal });
			return data;
		},
	};
}

export function clusterSizeDistributionQueryOptions(client: AxiosInstance) {
	return {
		...collectionAnalysisPolicy,
		queryKey: ["stats", "cluster-size-distribution"] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<ClusterSizeStat[]> => {
			const { data } = await client.get(
				`${STATS_BASE}/cluster-size-distribution`,
				{ signal },
			);
			return data;
		},
	};
}

export function formatProfileQueryOptions(client: AxiosInstance) {
	return {
		...collectionAnalysisPolicy,
		queryKey: ["stats", "format-profile"] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<SourceFormatStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/format-profile`, { signal });
			return data;
		},
	};
}

/**
 * The one collection query that is scoped: who duplicates THIS library. dcb-service
 * refuses a library role that asks for any library but its own (StatsScopeGuard).
 */
export function collectionOverlapQueryOptions(
	client: AxiosInstance,
	{ libraryCode }: { libraryCode: string },
) {
	return {
		...collectionAnalysisPolicy,
		queryKey: ["stats", "collection-overlap", libraryCode] as const,
		meta: OPTIONAL_QUERY,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<CollectionOverlapStat[]> => {
			const { data } = await client.get(`${STATS_BASE}/collection-overlap`, {
				params: cleanParams({ libraryCode }),
				signal,
			});
			return data;
		},
	};
}
