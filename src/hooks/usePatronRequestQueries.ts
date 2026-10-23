// This gets everything we need for a page that's displaying patron requests
// i.e. the requests, the libraries (for the filters), and ideally the locations too
// It also deals with the models
// And it needs configuration options as some pages might not need everything, per se
import { clampPageSize } from "@constants/dataGrid/pagination";
import { useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { useMemo } from "react";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { libraryFilterOptionsQueryOptions } from "@helpers/sharedQueries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import {
	GridColDef,
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import { getPatronRequestModeQuery } from "@helpers/dataGrid/getPatronRequestModeQuery";
import { borrowingScopeHostLms, hasBorrowingScope } from "@helpers/patronRequestScope";

interface UsePatronRequestQueriesProps {
	apiBase: string;
	filterModel: GridFilterModel; // Note that this should be the debounced filter model or you will get weirdness.
	paginationModel: GridPaginationModel;
	sortModel: GridSortModel;
	additionalQuery: string; // Any additional queries (such as bib cluster UUID for requesting history)
	mode: string;
}

export const usePatronRequestQueries = ({
	apiBase,
	filterModel,
	paginationModel,
	sortModel,
	additionalQuery,
	mode,
}: UsePatronRequestQueriesProps) => {
	// The library being looked at. Empty only while the claim is still loading, which
	// the enabled guards below already wait on.
	const { agencyCode } = useAgencyCodes();
	const code = agencyCode ?? "";

	// Get the libraries. Used for the various library filters
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryFilterOptionsQueryOptions(apiBase));

	// Memoised because `?? []` allocates a new array on every render, which made
	// every memo keyed on it recompute every render.
	const libraries = useMemo(
		() => librariesData?.libraries?.content ?? [],
		[librariesData],
	);
	const userLibrary = libraries.find(
		(library: any) => library.agencyCode === code,
	);
	const userLibraryHostLmsCode = userLibrary?.agency?.hostLms?.code ?? "";

	const dynamicColumns = useMemo(() => {
		if (!libraries) return standardPatronRequestColumns;

		const libraryFilterOptions = libraries.map((lib: any) => ({
			value: lib.agencyCode,
			label: lib.fullName,
		}));

		return standardPatronRequestColumns.map((col) => {
			if (col.field === "supplyingAgencyCode") {
				return {
					...col,
					type: "singleSelect",
					valueOptions: libraryFilterOptions,
				} as GridColDef;
			}
			return col;
		});
	}, [libraries]);

	// Get the actual requests themselves. These are what goes in the grid
	const grid = gridPage(filterModel, paginationModel, sortModel);
	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: queryKeys.patronRequests.list(
			apiBase,
			{
				agencyCode: code,
				hostLmsCode: borrowingScopeHostLms(userLibraryHostLmsCode),
				mode,
				additionalQuery,
			},
			grid,
		),
		queryFn: async ({ signal }) => {
			const baseQuery = additionalQuery
				? "(" +
					getPatronRequestModeQuery(mode, code, userLibraryHostLmsCode) +
					") AND " +
					additionalQuery
				: getPatronRequestModeQuery(mode, code, userLibraryHostLmsCode);
			const queryVariables = {
				query:
					processGridFilterModel(grid.filterModel, baseQuery, [
						"status",
						"description",
					]) ?? "",
				pagesize: clampPageSize(grid.pageSize),
				pageno: grid.page ?? 0,
				order: grid.sortField ?? "dateCreated",
				orderBy: grid.sortDirection?.toUpperCase() ?? "DESC",
			};
			return request({
				url: `${apiBase}/graphql`,
				document: getPatronRequests(),
				variables: queryVariables,
				requestHeaders: await authHeaders(),
				signal,
			});
		},
		enabled: !!apiBase && hasBorrowingScope(code, userLibraryHostLmsCode),
		placeholderData: (previousData) => previousData,
	});

	// Think about what else makes sense to return
	return {
		rows: patronRequestData?.patronRequests?.content ?? [],
		rowCount: patronRequestData?.patronRequests?.totalSize ?? 0,
		columns: dynamicColumns,
		isLoading:
			(isPatronRequestLoading && !patronRequestData) || librariesLoading,
		isFetching: isFetching && !!patronRequestData,
		isError: isPatronRequestError || librariesError,
		error,
	};
};
