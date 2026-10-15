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
import { bibsGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { BibsQueryData } from "@models/ReactQueryHelperTypes";
import { GridRowModesModel } from "@mui/x-data-grid-premium";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/bibs/")({
	validateSearch: gridSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.bibs.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const grid = useSyncedDataGrid(bibsGrid, Route.useSearch());
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

	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryQueryOptions(dcbApiBase, code ?? ""));
	const sourceSystemId =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.id ?? "";
	const page = gridPage(
		grid.appliedFilterModel,
		grid.paginationModel,
		grid.sortModel,
	);

	const {
		data: bibsData,
		isLoading: bibsDataLoading,
		isError: bibsError,
		error,
		isFetching,
	} = useQuery<BibsQueryData>({
		queryKey: queryKeys.bibs.list(dcbApiBase, sourceSystemId, page),
		queryFn: async ({ signal }) => {
			const baseQuery = `sourceSystemId:${sourceSystemId}`;
			const queryVariables = {
				query:
					processGridFilterModel(page.filterModel, baseQuery, ["title"]) ?? "",
				pagesize: clampPageSize(page.pageSize),
				pageno: page.page ?? 0,
				order: page.sortField ?? "dateUpdated",
				orderBy: page.sortDirection?.toUpperCase() ?? "DESC",
			};
			return request({
				url: `${dcbApiBase}/graphql`,
				document: getBibs,
				variables: queryVariables,
				requestHeaders: await authHeaders(),
				signal,
			});
		},
		enabled: !!dcbApiBase && !!sourceSystemId,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		// Keep previous data while new data is loading (v5 syntax)
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(
		grid,
		bibsError,
		error,
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
		grid.isFiltering || bibsDataLoading || (isFetching && !!bibsData);

	return (
		<>
			<Typography variant="h1">{t("nav.bibs.title")}</Typography>
			{
				<DataGrid
					disablePivoting
					rows={bibsData?.sourceBibs?.content ?? []}
					columns={bibsGrid.columns}
					columnVisibilityModel={grid.columnVisibilityModel}
					onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
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
					paginationModel={grid.paginationModel}
					onPaginationModelChange={grid.handlePaginationChange}
					filterMode="server"
					filterModel={grid.filterModel}
					onFilterModelChange={grid.handleFilterChange}
					sortingMode="server"
					sortModel={grid.sortModel}
					onSortModelChange={grid.handleSortChange}
					views={grid.views}
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
