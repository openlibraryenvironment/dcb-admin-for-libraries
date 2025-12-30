import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { standardBibColumns } from "@helpers/dataGrid/columns/bibColumns";
import { standardBibColumnVisibility } from "@helpers/dataGrid/columnVisibility/bibColumnVisbility";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import {
	BibsQueryData,
	LibrariesQueryData,
} from "@models/ReactQueryHelperTypes";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { getBibs } from "@queries/getBibs";
import { getLibrary } from "@queries/getLibrary";
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

export const Route = createFileRoute("/__authenticated/bibs/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
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
	const gridId = "bibs";
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
			storedState.pagination ?? { page: 0, pageSize: 25 }
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
	const sourceSystemId =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.id;
	// Bib Columns

	const {
		data: bibsData,
		isLoading: bibsDataLoading,
		isError: bibsError,
		error,
		isFetching,
	} = useQuery<BibsQueryData>({
		queryKey: [
			"getBibs",
			dcbApiBase,
			headers,
			sourceSystemId,
			debouncedFilterModel, // Use debounced filter model
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		queryFn: async () => {
			const baseQuery = `sourceSystemId:${sourceSystemId}`;
			const queryVariables = {
				query:
					processGridFilterModel(debouncedFilterModel, baseQuery, ["title"]) ??
					"",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "dateUpdated",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(`${dcbApiBase}/graphql`, getBibs, queryVariables, headers);
		},
		enabled: !!token && !!dcbApiBase && !!sourceSystemId,
		// refetchInterval: 1000000, // milliseconds
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
		console.log(error, bibsError, librariesError);
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
			{
				<DataGrid
					disablePivoting
					rows={bibsData?.sourceBibs?.content ?? []}
					columns={standardBibColumns}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="bibs"
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
					searchText={"bibs.search"}
					scrollbarVisible={false}
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
					// variant="filled"
					// sx={{ width: "100%" }}
					autoHideDuration={6000}
					alertText={
						t("ui.feedback.error.cannot_process") ||
						"We could not process that operation, so we have reset the data grid options."
					}></TimedAlert>
			}
		</>
	);
}
