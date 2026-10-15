import { suppliedByLibraryQuery } from "@helpers/patronRequestScope";
import { gridSearchSchema } from "@helpers/dataGrid/gridSearchSchema";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestExport } from "@/hooks/useExport";
import { usePatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";
import { CleanupProgressDialog } from "@components/DataGrid/components/CleanupProgressDialog";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { supplierRequestsGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { hostLmsLibraryOptions } from "@helpers/hostLmsLibraryOptions";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import {
	GridColDef,
	GridRowModesModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import {
	allLibrariesQueryOptions,
	invalidateRequestLists,
} from "@helpers/sharedQueries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/supplierRequests")({
	validateSearch: gridSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.supplier_requests.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const queryClient = useQueryClient();
	const apiRef = useGridApiRef();

	const grid = useSyncedDataGrid(supplierRequestsGrid, Route.useSearch());
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

	const [alert, setAlert] = useState<{
		open: boolean;
		severity: "success" | "error" | "warning";
		text: string | null;
	}>({
		open: false,
		severity: "success",
		text: null,
	});

	const handleSnackbarClose = (
		event?: React.SyntheticEvent | Event,
		reason?: string,
	) => {
		if (reason === "clickaway") {
			return;
		}
		setAlert({
			open: false,
			severity: "success",
			text: null,
		});
	};

	const { agencyCode: code, agencyCodes } = useAgencyCodes();

	const presetQuery = suppliedByLibraryQuery(code);
	const page = gridPage(
		grid.appliedFilterModel,
		grid.paginationModel,
		grid.sortModel,
	);

	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: queryKeys.supplierRequests.list(dcbApiBase, code ?? "", page),
		queryFn: async () => {
			const queryVariables = {
				// Already scoped: processGridFilterModel puts the preset query first.
				query: processGridFilterModel(page.filterModel, suppliedByLibraryQuery(code), [
					"status",
					"description",
				]),
				pagesize: clampPageSize(page.pageSize),
				pageno: page.page ?? 0,
				order: page.sortField ?? "dateCreated",
				orderBy: page.sortDirection?.toUpperCase() ?? "DESC",
			};

			return request(
				`${dcbApiBase}/graphql`,
				getPatronRequests,
				queryVariables,
				await authHeaders(),
			);
		},
		enabled: !!dcbApiBase && !!code,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	const { data: librariesData } = useQuery({
		...allLibrariesQueryOptions(dcbApiBase),
		enabled: !!dcbApiBase,
		refetchOnWindowFocus: false,
	});

	// Memoised because `?? []` allocates a new array on every render, which made
	// every memo keyed on it recompute every render.
	const libraries = useMemo(
		() => librariesData?.libraries?.content ?? [],
		[librariesData],
	);

	const libraryHostLmsOptions = useMemo(
		() => hostLmsLibraryOptions(libraries),
		[libraries],
	);

	const dynamicColumns = useMemo(() => {
		const targetField = "patronHostlmsCode";

		return supplierRequestsGrid.columns.map((col) => {
			if (col.field === targetField) {
				const selectCol: GridColDef = {
					...col,
					type: "singleSelect",
					valueOptions: libraryHostLmsOptions,
				};
				return selectCol;
			}
			return col;
		});
	}, [libraryHostLmsOptions]);

	useDataGridErrorSafely(grid, isPatronRequestError, error, () =>
		setAlert({
			open: true,
			severity: "warning",
			text: t("ui.feedback.error.cannot_process"),
		}),
	);

	const { cleanupState, handleCleanup, handleCloseCleanup } =
		usePatronRequestCleanup({
			apiRef,
			dcbApiBase,
			agencyCodes,
			onSuccess: (cleanedIds) => {
				void invalidateRequestLists(queryClient);
				for (const id of cleanedIds) {
					void queryClient.invalidateQueries({
						queryKey: queryKeys.patronRequests.detail(dcbApiBase, id),
					});
				}
			},
		});
	const { exportProgress, exportConfig } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		baseQuery: presetQuery,
		filterModel: grid.appliedFilterModel,
		sortModel: grid.sortModel,
		onExportResult: (result) => setAlert({ open: true, ...result }),
		type: "supplierRequests",
	});

	if (isPatronRequestLoading && !patronRequestData) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.supplier_requests.title").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (isPatronRequestError) {
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
		grid.isFiltering ||
		isPatronRequestLoading ||
		(isFetching && !!patronRequestData);
	return (
		<>
			<Typography variant="h1">
				{t("nav.supplier_requests.title")}
			</Typography>
			{
				<DataGrid
					disablePivoting
					rows={patronRequestData?.patronRequests?.content ?? []}
					columns={dynamicColumns}
					columnVisibilityModel={grid.columnVisibilityModel}
					checkboxSelection={true}
					onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
					type="patronRequests"
					label={t("nav.supplier_requests.title")}
					identifier="supplierPatronRequests"
					disableAggregation={true}
					disableHoverInteractions={true}
					disableRowGrouping={true}
					loading={shouldShowLoading}
					listViewEnabled={false}
					noResultsText={t("patron_request.no_requests")}
					pagination
					pivotingEnabled={false}
					toolbarVisible
					searchText={t("ui.data_grid.search_supplier_requests")}
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
					rowCount={patronRequestData?.patronRequests?.totalSize ?? 0}
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
					enableCleanup={true}
					onCleanup={handleCleanup}
					exportConfig={exportConfig}
					isExporting={exportProgress.isExporting}
					parentApiRef={apiRef}
				/>
			}
			<CleanupProgressDialog
				open={cleanupState.open}
				isCleaning={cleanupState.isCleaning}
				progress={
					cleanupState.total > 0
						? (cleanupState.processed / cleanupState.total) * 100
						: 0
				}
				total={cleanupState.total}
				processed={cleanupState.processed}
				successRows={cleanupState.successRows}
				errorRows={cleanupState.errorRows}
				skippedRows={cleanupState.skippedRows}
				refusedRows={cleanupState.refusedRows}
				onClose={handleCloseCleanup}
			/>

			{
				<TimedAlert
					open={alert.open}
					onCloseFunc={handleSnackbarClose}
					severityType={alert.severity}
					alertText={alert.text}></TimedAlert>
			}
		</>
	);
}
