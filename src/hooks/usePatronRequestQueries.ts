// This gets everything we need for a page that's displaying patron requests
// i.e. the requests, the libraries (for the filters), and ideally the locations too
// It also deals with the models
// And it needs configuration options as some pages might not need everything, per se
import { useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { useMemo } from "react";
import { getLibraries } from "@queries/getLibraries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import {
	GridColDef,
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { useAuth } from "react-oidc-context";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import { getPatronRequestModeQuery } from "@helpers/dataGrid/getPatronRequestModeQuery";

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
	const auth = useAuth();

	const code = auth.user?.profile?.code as string;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth?.user?.access_token}`,
		}),
		[auth?.user?.access_token],
	);

	// Get the libraries. Used for the various library filters
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["allLibraries", headers, code, apiBase],
		queryFn: async () =>
			request(
				`${apiBase}/graphql`,
				getLibraries,
				{
					query: "",
					pagesize: 1000,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				headers,
			),
	});

	const libraries = librariesData?.libraries?.content ?? [];
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
	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"getPatronRequests",
			apiBase,
			headers,
			userLibraryHostLmsCode,
			filterModel,
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
			additionalQuery,
			,
			mode,
			code,
		],
		queryFn: async () => {
			const baseQuery = additionalQuery
				? "(" +
					getPatronRequestModeQuery(mode, code, userLibraryHostLmsCode) +
					") AND " +
					additionalQuery
				: getPatronRequestModeQuery(mode, code, userLibraryHostLmsCode);
			const queryVariables = {
				query:
					processGridFilterModel(filterModel, baseQuery, [
						"status",
						"description",
					]) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "dateCreated",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(
				`${apiBase}/graphql`,
				getPatronRequests,
				queryVariables,
				headers,
			);
		},
		enabled: !!apiBase && !!userLibraryHostLmsCode,
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
