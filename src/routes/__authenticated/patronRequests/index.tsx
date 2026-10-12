import { gridSearchSchema } from "@helpers/dataGrid/gridSearchSchema";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestExport } from "@/hooks/useExport";
import DataGrid from "@components/DataGrid/DataGrid";
import { ExportProgressDialog } from "@components/DataGrid/components/ExportProgressDialog";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { patronRequestsGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
} from "@helpers/patronRequestScope";
import { Library } from "@models/Library";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import {
	GridColDef,
	GridRowModesModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { allLibrariesQueryOptions } from "@helpers/sharedQueries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/patronRequests/")({
	validateSearch: gridSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.patron_requests.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const apiRef = useGridApiRef();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const grid = useSyncedDataGrid(patronRequestsGrid, Route.useSearch());

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
		setAlert({ open: false, severity: "success", text: null });
	};
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

	const { agencyCode: code } = useAgencyCodes();

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(allLibrariesQueryOptions(dcbApiBase));

	// All libraries, supplied to the filters. Memoised because `?? []` allocates
	// a new array on every render, which made every memo keyed on it recompute
	// every render.
	const libraries = useMemo(
		() => librariesData?.libraries?.content ?? [],
		[librariesData],
	);
	const userLibrary = libraries.find((library) => library.agencyCode === code); // This is the user's library

	const userLibraryHostLmsCode = userLibrary?.agency?.hostLms?.code;

	const libraryFilterOptions = useMemo(() => {
		if (!libraries) return [];

		return libraries.map((lib: Library) => ({
			value: lib.agencyCode, // The value to be used in the filter (e.g., 'agency-code-123')
			label: lib.fullName, // The human-readable name (e.g., 'Main Library')
		}));
	}, [libraries]);

	// Columns that have dynamic options for their filters
	const dynamicPatronRequestColumns = useMemo(() => {
		const supplyingAgencyField = "supplyingAgencyCode";
		return patronRequestsGrid.columns.map((col) => {
			if (col.field === supplyingAgencyField) {
				const { ...baseColProps } = col;
				const selectCol: GridColDef = {
					...baseColProps,
					type: "singleSelect",
					valueOptions: libraryFilterOptions,
				};
				return selectCol;
			}
			return col;
		});
	}, [libraryFilterOptions]);

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
		// Both the agency and the Host LMS feed the scope this query runs under.
		queryKey: queryKeys.patronRequests.list(
			dcbApiBase,
			{ agencyCode: code ?? "", hostLmsCode: userLibraryHostLmsCode },
			page,
		),
		queryFn: async () => {
			const baseQuery = borrowedByLibraryQuery(code, userLibraryHostLmsCode);
			const queryVariables = {
				query:
					processGridFilterModel(page.filterModel, baseQuery, [
						"status",
						"description",
					]) ?? "",
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
		// Gated on whatever the scope is actually built from. Under the v9 filter that is
		// the agency claim, which is available immediately; waiting on the Host LMS would
		// hold the grid behind a lookup it no longer needs, and strand a library whose
		// agency has no Host LMS recorded.
		enabled: !!dcbApiBase && hasBorrowingScope(code, userLibraryHostLmsCode),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(grid, isPatronRequestError, error, () =>
		setAlert({
			open: true,
			severity: "warning",
			text: t("ui.feedback.error.cannot_process"),
		}),
	);

	// No cleanup here: this grid lists what THIS library borrowed, and cleanup belongs to
	// the library that supplied the request - see supplierRequests.tsx.
	const { exportProgress, exportConfig, cancelExport } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		baseQuery: borrowedByLibraryQuery(code, userLibraryHostLmsCode),
		filterModel: grid.appliedFilterModel,
		sortModel: grid.sortModel,
		onExportResult: (result) => setAlert({ open: true, ...result }),
		type: "patronRequests",
	});
	// Show loading if initial load or libraries are loading
	if ((isPatronRequestLoading && !patronRequestData) || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.patron_requests.title").toLowerCase(),
				})}
				subtitle={t("ui.feedback.please_wait")}
			/>
		);
	}
	if (isPatronRequestError || librariesError) {
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
		grid.isFiltering ||
		isPatronRequestLoading ||
		(isFetching && !!patronRequestData);

	return (
		<>
			<Typography variant="h1">
				{t("nav.patron_requests.title")}
			</Typography>
			{
				<DataGrid
					parentApiRef={apiRef}
					disablePivoting
					rows={patronRequestData?.patronRequests?.content ?? []}
					columns={dynamicPatronRequestColumns}
					columnVisibilityModel={grid.columnVisibilityModel}
					onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
					type="patronRequests"
					label={t("nav.patron_requests.title")}
					identifier="patronRequestsMain"
					checkboxSelection={true}
					disableAggregation={true}
					disableHoverInteractions={true}
					disableRowGrouping={true}
					loading={shouldShowLoading} // Show loading when filtering or fetching
					listViewEnabled={false}
					noResultsText={t("patron_request.no_requests")}
					pagination
					pivotingEnabled={false}
					toolbarVisible
					searchText={t("ui.actions.search")}
					paginationMode="server"
					paginationModel={grid.paginationModel}
					onPaginationModelChange={grid.handlePaginationChange}
					filterMode="server"
					filterModel={grid.filterModel}
					onFilterModelChange={grid.handleFilterChange}
					sortingMode="server"
					sortModel={grid.sortModel}
					onSortModelChange={grid.handleSortChange}
					rowCount={patronRequestData?.patronRequests?.totalSize ?? 0}
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
					exportConfig={exportConfig}
					isExporting={exportProgress.isExporting}
				/>
			}
			<ExportProgressDialog
				open={exportProgress.isExporting}
				progress={exportProgress.progress}
				totalRecords={exportProgress.totalRecords}
				onCancel={cancelExport}
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
