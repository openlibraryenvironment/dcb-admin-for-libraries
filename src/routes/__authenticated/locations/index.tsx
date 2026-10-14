import { gridSearchSchema } from "@helpers/dataGrid/gridSearchSchema";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { locationsGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { LocationsQueryData } from "@models/ReactQueryHelperTypes";
import { GridRowModesModel } from "@mui/x-data-grid-premium";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/locations/")({
	validateSearch: gridSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.locations.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const grid = useSyncedDataGrid(locationsGrid, Route.useSearch());
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

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

	const { agencyCode: code } = useAgencyCodes();

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryQueryOptions(dcbApiBase, code ?? ""));
	const agencyId = librariesData?.libraries?.content?.[0]?.agency?.id ?? "";
	const page = gridPage(
		grid.appliedFilterModel,
		grid.paginationModel,
		grid.sortModel,
	);

	const {
		data: locationsData,
		isLoading: locationsDataLoading,
		isError: locationsError,
		error,
		isFetching,
	} = useQuery<LocationsQueryData>({
		queryKey: queryKeys.locations.list(dcbApiBase, agencyId, page),
		queryFn: async () => {
			const baseQuery = `agency:${agencyId}`;
			const queryVariables = {
				query:
					processGridFilterModel(page.filterModel, baseQuery, [
						"name",
						"code",
					]) ?? "",
				pagesize: clampPageSize(page.pageSize),
				pageno: page.page ?? 0,
				order: page.sortField ?? "name",
				orderBy: page.sortDirection?.toUpperCase() ?? "DESC",
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
		grid,
		locationsError,
		error,
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
		grid.isFiltering || locationsDataLoading || (isFetching && !!locationsData);

	return (
		<>
			<Typography variant="h1">{t("nav.locations.title")}</Typography>
			{
				<DataGrid
					disablePivoting
					rows={locationsData?.locations?.content ?? []}
					columns={locationsGrid.columns}
					columnVisibilityModel={grid.columnVisibilityModel}
					onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
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
					paginationModel={grid.paginationModel}
					onPaginationModelChange={grid.handlePaginationChange}
					filterMode="server"
					filterModel={grid.filterModel}
					onFilterModelChange={grid.handleFilterChange}
					sortingMode="server"
					sortModel={grid.sortModel}
					onSortModelChange={grid.handleSortChange}
					views={grid.views}
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
