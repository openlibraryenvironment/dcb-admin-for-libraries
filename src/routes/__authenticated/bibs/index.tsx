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
import { standardBibColumns } from "@helpers/dataGrid/columns/bibColumns";
import { standardBibColumnVisibility } from "@helpers/dataGrid/columnVisibility/bibColumnVisbility";
import {
	checkIfFiltering,
	processGridFilterModel,
} from "@helpers/dataGrid/utilities";
import { BibsQueryData } from "@models/ReactQueryHelperTypes";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { getBibs } from "@queries/getBibs";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/bibs/")({
	head: () => ({ meta: [{ title: pageTitle("nav.bibs.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const gridId = "bibs";
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
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? standardBibColumnVisibility
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

	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryQueryOptions(dcbApiBase, code ?? ""));
	const sourceSystemId =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.id ?? "";
	const grid = gridPage(debouncedFilterModel, paginationModel, sortModel);

	const {
		data: bibsData,
		isLoading: bibsDataLoading,
		isError: bibsError,
		error,
		isFetching,
	} = useQuery<BibsQueryData>({
		queryKey: queryKeys.bibs.list(dcbApiBase, sourceSystemId, grid),
		queryFn: async () => {
			const baseQuery = `sourceSystemId:${sourceSystemId}`;
			const queryVariables = {
				query:
					processGridFilterModel(grid.filterModel, baseQuery, ["title"]) ?? "",
				pagesize: clampPageSize(grid.pageSize),
				pageno: grid.page ?? 0,
				order: grid.sortField ?? "dateUpdated",
				orderBy: grid.sortDirection?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getBibs,
				queryVariables,
				await authHeaders(),
			);
		},
		enabled: !!dcbApiBase && !!sourceSystemId,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		// Keep previous data while new data is loading (v5 syntax)
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(
		gridId,
		bibsError,
		error,
		setLocalFilterModel,
		setLocalSortModel,
		() => setSnackbarOpen(true)
	);

	if ((bibsDataLoading && !bibsData) || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.bibs.title").toLowerCase(),
				})}
				subtitle={t("ui.feedback.please_wait")}
			/>
		);
	}
	if (bibsError || librariesError) {
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

	const shouldShowLoading =
		isFiltering || bibsDataLoading || (isFetching && !!bibsData);

	return (
		<>
			<Typography variant="h1">{t("nav.bibs.title")}</Typography>
			{
				<DataGrid
					disablePivoting
					rows={bibsData?.sourceBibs?.content ?? []}
					columns={standardBibColumns}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="bibs"
					label={t("nav.bibs.title")}
					identifier="bibs"
					checkboxSelection={false}
					disableAggregation={true}
					disableHoverInteractions={true}
					disableRowGrouping={true}
					loading={shouldShowLoading}
					listViewEnabled={false}
					noResultsText={t("audit.no_results")}
					pagination
					pivotingEnabled={false}
					toolbarVisible
					searchText={t("bibs.search")}
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationChange}
					filterMode="server"
					filterModel={filterModel}
					onFilterModelChange={handleFilterChange}
					sortingMode="server"
					sortModel={sortModel}
					onSortModelChange={handleSortChange}
					rowCount={bibsData?.sourceBibs?.totalSize ?? 0}
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
