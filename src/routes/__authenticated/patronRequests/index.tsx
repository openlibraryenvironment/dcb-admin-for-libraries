import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import {
	defaultPatronRequestColumnVisibility,
	standardPatronRequestColumns,
} from "@helpers/dataGrid/columns";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { getLibrary } from "@queries/getLibrary";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	// useNavigate,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/patronRequests/")({
	component: RouteComponent,
});

const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = "";
	if (columnFilterQueries.length > 0) {
		finalQuery = `(${columnFilterQueries.join(` ${logicOperator.toUpperCase()} `)})`;
	}

	if (quickFilterValues.length > 0) {
		const quickFilterQuery = quickFilterValues
			.map(
				(val) =>
					`(fromValue:*${val}* OR toValue:*${val}* OR fromCategory:*${val}* OR toCategory:*${val}*)`
			)
			.join(" AND ");

		if (finalQuery) {
			finalQuery += ` AND (${quickFilterQuery})`;
		} else {
			finalQuery = quickFilterQuery;
		}
	}

	if (baseQuery) {
		return finalQuery ? `${baseQuery} AND (${finalQuery})` : baseQuery;
	}
	return finalQuery;
};

function RouteComponent() {
	const { t } = useTranslation();
	// const navigate = useNavigate();
	const auth = useAuth();

	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const token = auth?.user?.access_token;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth?.user?.access_token}`,
		}),
		[token]
	);
	const gridId = "mainPatronRequests";
	const {
		sortModel: storedSortModel,
		filterModel: storedFilterModel,
		paginationModel: storedPaginationModel,
		columnVisibilityModel: storedColumnVisibilityModel,
		setSortModel,
		setFilterModel,
		setPaginationModel,
		setColumnVisibilityModel,
	} = useGridStore();

	const storedState = {
		sort: storedSortModel[gridId],
		filter: storedFilterModel[gridId],
		pagination: storedPaginationModel[gridId],
		columnVisibility: storedColumnVisibilityModel[gridId],
	};

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 20 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? defaultPatronRequestColumnVisibility
	);

	// Add state to track if we're filtering
	const [isFiltering, setIsFiltering] = useState(false);

	// Track when filter is being applied
	useEffect(() => {
		const hasActiveFilters =
			filterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null
			) ||
			(filterModel.quickFilterValues &&
				filterModel.quickFilterValues.length > 0);

		const hasActiveDebounceFilters =
			debouncedFilterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null
			) ||
			(debouncedFilterModel.quickFilterValues &&
				debouncedFilterModel.quickFilterValues.length > 0);

		// We're filtering if there are active filters but they don't match debounced filters
		const isDifferent =
			JSON.stringify(filterModel) !== JSON.stringify(debouncedFilterModel);
		setIsFiltering(!!hasActiveFilters && isDifferent);
	}, [filterModel, debouncedFilterModel]);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setLocalPaginationModel(model);
			setPaginationModel(gridId, model);
		},
		[gridId, setPaginationModel]
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setLocalFilterModel(model);
			setFilterModel(gridId, model);
		},
		[gridId, setFilterModel]
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			setLocalSortModel(model);
			setSortModel(gridId, model);
		},
		[gridId, setSortModel]
	);

	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) => {
			setLocalColumnVisibilityModel(model);
			setColumnVisibilityModel(gridId, model);
		},
		[gridId, setColumnVisibilityModel]
	);

	const code = auth.user?.profile?.code;

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", headers, code, dcbApiBase],
		queryFn: async () =>
			request(
				`${dcbApiBase}/graphql`,
				getLibrary,
				{
					query: "agencyCode:" + code,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
	});
	const libraryHostLmsCode =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.code;

	// Patron requests query - using debounced filter model
	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"getPatronRequests",
			dcbApiBase,
			headers,
			libraryHostLmsCode,
			debouncedFilterModel, // Use debounced filter model
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		queryFn: async () => {
			const baseQuery = `patronHostlmsCode:${libraryHostLmsCode}`;
			const queryVariables = {
				query: processMuiFilterModel(debouncedFilterModel, baseQuery) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "dateCreated",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getPatronRequests,
				queryVariables,
				headers
			);
		},
		enabled: !!token && !!dcbApiBase && !!libraryHostLmsCode,
		// refetchInterval: 1000000, // milliseconds
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		// Keep previous data while new data is loading (v5 syntax)
		placeholderData: (previousData) => previousData,
	});

	// Show loading if initial load or libraries are loading
	if ((isPatronRequestLoading && !patronRequestData) || librariesLoading) {
		return <Loading title="Patron requests loading" subtitle="Please wait" />;
	}
	if (isPatronRequestError) {
		console.log(error, isPatronRequestError, librariesError);
		return (
			<Error
				title={t("ui.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.actions.go_back")}
				goBack="/"
			/>
		);
	}

	// Determine if we should show loading state
	const shouldShowLoading =
		isFiltering ||
		isPatronRequestLoading ||
		(isFetching && !!patronRequestData);

	return (
		<>
			<DataGrid
				disablePivoting
				rows={patronRequestData?.patronRequests?.content ?? []}
				columns={standardPatronRequestColumns}
				columnVisibilityModel={columnVisibilityModel}
				onColumnVisibilityModelChange={handleColumnVisibilityChange}
				type="patronRequests"
				identifier="patronRequestsMain"
				checkboxSelection={false}
				disableAggregation={true}
				disableHoverInteractions={true}
				disableRowGrouping={true}
				loading={shouldShowLoading} // Show loading when filtering or fetching
				listViewEnabled={false}
				noResultsText={t("audit.no_results")}
				pagination
				pivotingEnabled={false}
				toolbarVisible
				searchText="Search by patron request"
				scrollbarVisible={false}
				paginationMode="server"
				paginationModel={paginationModel}
				onPaginationModelChange={handlePaginationChange}
				filterMode="server"
				filterModel={filterModel} // Use immediate filter model for UI
				onFilterModelChange={handleFilterChange}
				sortingMode="server"
				sortModel={sortModel}
				onSortModelChange={handleSortChange}
				rowCount={patronRequestData?.patronRequests?.totalSize ?? 0}
				rowModesModel={rowModesModel}
				onRowModesModelChange={setRowModesModel}
			/>
		</>
	);
}
