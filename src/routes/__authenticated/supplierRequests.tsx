import { suppliedByLibraryQuery } from "@helpers/patronRequestScope";
import { validateGridSearch } from "@helpers/viewState/gridSearch";
import { supplierRequestsView } from "@helpers/viewState/gridViewIds";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestExport } from "@/hooks/useExport";
import { usePatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";
import { CleanupProgressDialog } from "@components/DataGrid/components/CleanupProgressDialog";
import { CleanupOverrideDialog } from "@components/CleanupOverrideDialog/CleanupOverrideDialog";
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
	invalidateRequestLists,
	libraryFilterOptionsQueryOptions,
} from "@helpers/sharedQueries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/supplierRequests")({
	validateSearch: validateGridSearch,
	beforeLoad: async ({ search, location }) => {
		// Loaded here, not with the route: the first load of every page would carry the codec
		const { rememberedViewRedirect } = await import("@helpers/viewState/viewRoute");
		const restore = rememberedViewRedirect(supplierRequestsView, search, location.state);
		if (restore) throw redirect({ to: "/supplierRequests", ...restore });
	},
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
		queryFn: async ({ signal }) => {
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

			return request({
				url: `${dcbApiBase}/graphql`,
				document: getPatronRequests(),
				variables: queryVariables,
				requestHeaders: await authHeaders(),
				signal,
			});
		},
		enabled: !!dcbApiBase && !!code,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	const { data: librariesData } = useQuery({
		...libraryFilterOptionsQueryOptions(dcbApiBase),
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

	const cleanup =
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
					onCleanup={cleanup.handleCleanup}
					exportConfig={exportConfig}
					isExporting={exportProgress.isExporting}
					parentApiRef={apiRef}
				/>
			}
			<CleanupProgressDialog
				open={cleanup.cleanupState.open}
				isCleaning={cleanup.cleanupState.isCleaning}
				progress={
					cleanup.cleanupState.total > 0
						? (cleanup.cleanupState.processed / cleanup.cleanupState.total) * 100
						: 0
				}
				total={cleanup.cleanupState.total}
				processed={cleanup.cleanupState.processed}
				successRows={cleanup.cleanupState.successRows}
				errorRows={cleanup.cleanupState.errorRows}
				skippedRows={cleanup.cleanupState.skippedRows}
				refusedRows={cleanup.cleanupState.refusedRows}
				onOverride={cleanup.requestOverride}
				onClose={cleanup.handleCloseCleanup}
			/>
			<CleanupOverrideDialog
				open={cleanup.overrideConfirmOpen}
				count={cleanup.cleanupState.refusedRows.length}
				onClose={cleanup.cancelOverride}
				onConfirm={() => void cleanup.confirmOverride()}
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
