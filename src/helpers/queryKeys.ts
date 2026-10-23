import type {
	GridFilterModel,
	GridPaginationModel,
	GridSortDirection,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import type { HomeWindow } from "@helpers/home";

/** One page of a server-paged grid, as far as a query key needs to know it. */
export interface GridPage {
	filterModel: GridFilterModel;
	page: number;
	pageSize: number;
	sortField?: string;
	sortDirection?: GridSortDirection;
}

export const gridPage = (
	filterModel: GridFilterModel,
	{ page, pageSize }: GridPaginationModel,
	sortModel: GridSortModel,
): GridPage => ({
	filterModel,
	page,
	pageSize,
	sortField: sortModel[0]?.field,
	sortDirection: sortModel[0]?.sort,
});

/**
 * Every query key in the application. A key carries the API base and the
 * business identifiers a response depends on, and never a credential: the token
 * is read when the request is sent (docs/auth.md), and
 * tests/queryKeyCredentials.test.ts fails a key that names one.
 */
export const queryKeys = {
	library: {
		detail: (apiBase: string, agencyCode: string) =>
			["library", "detail", apiBase, agencyCode] as const,
		serviceConfig: (apiBase: string, agencyCode: string) =>
			["library", "serviceConfig", apiBase, agencyCode] as const,
		own: (apiBase: string, agencyCode: string) =>
			["library", "own", apiBase, agencyCode] as const,
		basics: (apiBase: string, agencyCode: string) =>
			["library", "basics", apiBase, agencyCode] as const,
		name: (apiBase: string, agencyCode: string) =>
			["library", "name", apiBase, agencyCode] as const,
		names: (apiBase: string, agencyCodes: readonly string[]) =>
			["library", "names", apiBase, agencyCodes] as const,
	},
	libraries: {
		all: (apiBase: string) => ["libraries", "all", apiBase] as const,
		filterOptions: (apiBase: string) => ["libraries", "filterOptions", apiBase] as const,
	},
	requestStats: {
		supplied: (apiBase: string, agencyCode: string) =>
			["requestStats", "supplied", apiBase, agencyCode] as const,
		borrowed: (apiBase: string, agencyCode: string, hostLmsCode?: string) =>
			["requestStats", "borrowed", apiBase, agencyCode, hostLmsCode] as const,
	},
	patronRequests: {
		lists: () => ["patronRequests", "list"] as const,
		list: (
			apiBase: string,
			scope: {
				agencyCode: string;
				hostLmsCode?: string;
				mode?: string;
				additionalQuery?: string;
			},
			grid: GridPage,
		) => ["patronRequests", "list", apiBase, scope, grid] as const,
		detail: (apiBase: string, id: string) =>
			["patronRequests", "detail", apiBase, id] as const,
		essentials: (apiBase: string, id: string | null) =>
			["patronRequests", "essentials", apiBase, id] as const,
	},
	home: {
		counts: (
			apiBase: string,
			scopes: { borrowed: string; supplied: string },
			window: HomeWindow,
		) => ["home", "counts", apiBase, scopes, window] as const,
		lastWeek: (
			apiBase: string,
			scopes: { borrowed: string; supplied: string },
			since: string,
			until: string,
		) => ["home", "lastWeek", apiBase, scopes, since, until] as const,
		history: (apiBase: string, scopes: { borrowed: string; supplied: string }) =>
			["home", "history", apiBase, scopes] as const,
		pickupHere: (
			apiBase: string,
			locationIds: readonly string[],
			borrowedScope: string,
		) => ["home", "pickupHere", apiBase, locationIds, borrowedScope] as const,
		agencyLocations: (apiBase: string, agencyCode: string) =>
			["home", "agencyLocations", apiBase, agencyCode] as const,
	},
	release: {
		info: () => ["release", "info"] as const,
	},
	savedFilters: {
		list: (gridId: string) => ["savedFilters", "list", gridId] as const,
	},
	supplierRequests: {
		lists: () => ["supplierRequests", "list"] as const,
		list: (apiBase: string, agencyCode: string, grid: GridPage) =>
			["supplierRequests", "list", apiBase, agencyCode, grid] as const,
	},
	audits: {
		/** Every page of one request's audit log. */
		forPatronRequestAll: (apiBase: string, patronRequestId: string) =>
			["audits", "forPatronRequest", apiBase, patronRequestId] as const,
		forPatronRequest: (apiBase: string, patronRequestId: string, grid: GridPage) =>
			["audits", "forPatronRequest", apiBase, patronRequestId, grid] as const,
		detail: (apiBase: string, auditId: string) =>
			["audits", "detail", apiBase, auditId] as const,
		neighbours: (apiBase: string, patronRequestId: string, auditDate: string) =>
			["audits", "neighbours", apiBase, patronRequestId, auditDate] as const,
	},
	bibs: {
		list: (apiBase: string, sourceSystemId: string, grid: GridPage) =>
			["bibs", "list", apiBase, sourceSystemId, grid] as const,
		detail: (apiBase: string, id: string) =>
			["bibs", "detail", apiBase, id] as const,
		sourceRecord: (apiBase: string, id: string) =>
			["bibs", "sourceRecord", apiBase, id] as const,
	},
	locations: {
		list: (apiBase: string, agencyId: string, grid: GridPage) =>
			["locations", "list", apiBase, agencyId, grid] as const,
		detail: (apiBase: string, id: string) =>
			["locations", "detail", apiBase, id] as const,
		/** A whole reference list for a form, by its search query. */
		reference: (apiBase: string, query: string) =>
			["locations", "reference", apiBase, query] as const,
	},
	mappings: {
		forHostLms: (apiBase: string, hostLmsCode: string) =>
			["mappings", apiBase, hostLmsCode] as const,
		list: (apiBase: string, hostLmsCode: string, grid: GridPage) =>
			["mappings", apiBase, hostLmsCode, grid] as const,
	},
	patronIdentities: {
		byLocalId: (apiBase: string, localId: string) =>
			["patronIdentities", apiBase, localId] as const,
	},
	hostLms: {
		byCode: (apiBase: string, code: string) =>
			["hostLms", apiBase, code] as const,
	},
	agencies: {
		byHostLms: (apiBase: string, hostLmsId: string) =>
			["agencies", "byHostLms", apiBase, hostLmsId] as const,
	},
	announcements: {
		forScope: (apiBase: string, scopeId: string) =>
			["announcements", apiBase, scopeId] as const,
	},
	insights: {
		topRequestors: (apiBase: string, libraryCode: string) =>
			["insights", "topRequestors", apiBase, libraryCode] as const,
		topTitles: (apiBase: string, libraryCode: string) =>
			["insights", "topTitles", apiBase, libraryCode] as const,
	},
	search: {
		results: (searchBase: string, query: string, pageno: number, pagesize: number) =>
			["search", "results", searchBase, query, pageno, pagesize] as const,
		clusterDetail: (searchBase: string, recordId: string) =>
			["search", "clusterDetail", searchBase, recordId] as const,
	},
	serviceInfo: {
		brandAssetStore: (apiBase: string) =>
			["serviceInfo", "brandAssetStore", apiBase] as const,
		version: (apiBase: string) => ["serviceInfo", "version", apiBase] as const,
	},
};
