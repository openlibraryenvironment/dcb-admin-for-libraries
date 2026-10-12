import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { defaultLocationColumns } from "@helpers/dataGrid/columns/locationColumns";
import { standardLocationsColumnVisibility } from "@helpers/dataGrid/columnVisibility/locationColumnVisibility";
import {
	checkIfFiltering,
	processGridFilterModel,
} from "@helpers/dataGrid/utilities";
import { LocationsQueryData } from "@models/ReactQueryHelperTypes";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import { getLocations } from "@queries/getLocations";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/locations/")({
	head: () => ({ meta: [{ title: pageTitle("nav.locations.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const gridId = "locations";
	const storedState = {
		sort: useGridStore((state) => state.sortModel[gridId]),
		filter: useGridStore((state) => state.filterModel[gridId]),
		pagination: useGridStore((state) => state.paginationModel[gridId]),
		columnVisibility: useGridStore(
			(state) => state.columnVisibilityModel[gridId],
		),
	};
	const setSortModel = useGridStore((state) => state.setSortModel);
	const setFilterModel = useGridStore((state) => state.setFilterModel);
	const setPaginationModel = useGridStore((state) => state.setPaginationModel);
	const setColumnVisibilityModel = useGridStore(
		(state) => state.setColumnVisibilityModel,
	);

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 25 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);
	const isFiltering = checkIfFiltering(filterModel, debouncedFilterModel);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "lastImported", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? standardLocationsColumnVisibility
	);

	const [snackbarOpen, setSnackbarOpen] = useState(false);

	const handleSnackbarClose = (
		event?: React.SyntheticEvent | Event,
		reason?: string
	) => {
		if (reason === "clickaway") {
			return;
		}
		setSnackbarOpen(false);
	};

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

	const { agencyCode: code } = useAgencyCodes();

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryQueryOptions(dcbApiBase, code ?? ""));
	const agencyId = librariesData?.libraries?.content?.[0]?.agency?.id ?? "";
	const grid = gridPage(debouncedFilterModel, paginationModel, sortModel);

	const {
		data: locationsData,
		isLoading: locationsDataLoading,
		isError: locationsError,
		error,
		isFetching,
	} = useQuery<LocationsQueryData>({
		queryKey: queryKeys.locations.list(dcbApiBase, agencyId, grid),
		queryFn: async () => {
			const baseQuery = `agency:${agencyId}`;
			const queryVariables = {
				query:
					processGridFilterModel(grid.filterModel, baseQuery, [
						"name",
						"code",
					]) ?? "",
				pagesize: clampPageSize(grid.pageSize),
				pageno: grid.page ?? 0,
				order: grid.sortField ?? "name",
				orderBy: grid.sortDirection?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getLocations,
				queryVariables,
				await authHeaders()
			);
		},
		enabled: !!dcbApiBase && !!agencyId,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(
		gridId,
		locationsError,
		error,
		setLocalFilterModel,
		setLocalSortModel,
		() => setSnackbarOpen(true)
	);

	if ((locationsDataLoading && !locationsData) || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.locations.title").toLowerCase(),
				})}
				subtitle={t("ui.feedback.please_wait")}
			/>
		);
	}
	if (locationsError || librariesError) {
		return (
			<Error
				title={t("ui.feedback.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.actions.go_back")}
				goBack="/"
			/>
		);
	}

	// Determine if we should show loading state
	const shouldShowLoading =
		isFiltering || locationsDataLoading || (isFetching && !!locationsData);

	return (
		<>
			<Typography variant="h1">{t("nav.locations.title")}</Typography>
			{
				<DataGrid
					disablePivoting
					rows={locationsData?.locations?.content ?? []}
					columns={defaultLocationColumns}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="locations"
					label={t("nav.locations.title")}
					identifier="locations"
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
					searchText={t("ui.data_grid.search_locations")}
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationChange}
					filterMode="server"
					filterModel={filterModel} // Use immediate filter model for UI
					onFilterModelChange={handleFilterChange}
					sortingMode="server"
					sortModel={sortModel}
					onSortModelChange={handleSortChange}
					rowCount={locationsData?.locations?.totalSize ?? 0}
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
				/>
			}
			{
				<TimedAlert
					open={snackbarOpen}
					onCloseFunc={handleSnackbarClose}
					severityType="warning"
					alertText={
						t("ui.feedback.error.cannot_process")
					}></TimedAlert>
			}
		</>
	);
}
