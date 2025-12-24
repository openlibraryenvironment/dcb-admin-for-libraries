import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { equalsOnly, standardFilters } from "@constants/filters/filters";
import { standardLocationsColumnVisibility } from "@helpers/dataGrid/columns";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import {
	LibrariesQueryData,
	LocationsQueryData,
} from "@models/ReactQueryHelperTypes";
import {
	GridColDef,
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { getLibrary } from "@queries/getLibrary";
import { getLocations } from "@queries/getLocations";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	// useNavigate,
	useRouter,
} from "@tanstack/react-router";
import dayjs from "dayjs";
import request from "graphql-request";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/locations/")({
	component: RouteComponent,
});

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
	const gridId = "locations";
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
	const agencyId = librariesData?.libraries?.content?.[0]?.agency?.id;
	const defaultLocationColumns: GridColDef[] = [
		// ...customColumns,
		{
			field: "hostSystemName",
			headerName: "Host LMS name",
			minWidth: 150,
			flex: 0.6,
			filterable: false,
			sortable: false,
			valueGetter: (value, row: { hostSystem: { name: string } }) =>
				row?.hostSystem?.name,
		},
		{
			field: "name",
			headerName: "Location name",
			minWidth: 150,
			flex: 0.6,
			editable: true,
			filterOperators: standardFilters,
		},
		{
			field: "printLabel",
			headerName: "Print label",
			minWidth: 150,
			flex: 0.6,
			editable: true,
			filterOperators: standardFilters,
		},
		{
			field: "code",
			headerName: "Location code",
			minWidth: 50,
			flex: 0.4,
			filterOperators: standardFilters,
		},
		{
			field: "isPickup",
			headerName: t("location.pickup_status"),
			minWidth: 50,
			flex: 0.4,
			filterOperators: equalsOnly,
			sortable: false,
			valueFormatter: (value: boolean) => {
				if (value == true) {
					return t("ui.feedback.enabled");
				} else if (value == false) {
					return t("ui.feedback.disabled");
				} else {
					return t("ui.feedback.not_set");
				}
			},
		},
		{
			field: "localId",
			headerName: t("details.local_id"),
			minWidth: 50,
			flex: 0.8,
			filterOperators: equalsOnly,
			sortable: false,
			editable: true,
		},
		{
			field: "id",
			headerName: "Location UUID",
			minWidth: 50,
			flex: 0.8,
			sortable: false,
			filterOperators: equalsOnly,
		},
		{
			field: "lastImported",
			headerName: "Last imported",
			minWidth: 100,
			flex: 0.5,
			sortable: true,
			filterOperators: standardFilters,
			valueGetter: (value: any, row: { lastImported: any }) => {
				const lastImported = row.lastImported;
				const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
				if (formattedDate == "Invalid Date") {
					return "";
				} else {
					return formattedDate;
				}
			},
		},
		{
			field: "isPickupAnywhere",
			headerName: t("location.pickup_anywhere_status"),
			minWidth: 50,
			flex: 0.4,
			sortable: false,
			filterOperators: equalsOnly,
			valueFormatter: (value: boolean) => {
				if (value == true) {
					return t("ui.feedback.enabled");
				} else if (value == false) {
					return t("ui.feedback.disabled");
				} else {
					return t("ui.feedback.not_set");
				}
			},
		},
	];

	const {
		data: locationsData,
		isLoading: locationsDataLoading,
		isError: locationsError,
		error,
		isFetching,
	} = useQuery<LocationsQueryData>({
		queryKey: [
			"getLocations",
			dcbApiBase,
			headers,
			agencyId,
			debouncedFilterModel,
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		queryFn: async () => {
			const baseQuery = `agency:${agencyId}`;
			const queryVariables = {
				query:
					processGridFilterModel(debouncedFilterModel, baseQuery, [
						"name",
						"code",
					]) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "name",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getLocations,
				queryVariables,
				headers
			);
		},
		enabled: !!token && !!dcbApiBase && !!agencyId,
		// refetchInterval: 1000000, // milliseconds
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
					document_type: t("nav.patronRequests.title").toLowerCase(),
				})}
				subtitle={t("ui.feedback.please_wait")}
			/>
		);
	}
	if (locationsError || librariesError) {
		console.log(error, locationsError, librariesError);
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
			{
				<DataGrid
					disablePivoting
					rows={locationsData?.locations?.content ?? []}
					columns={defaultLocationColumns}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="locations"
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
					searchText="Search by location"
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
