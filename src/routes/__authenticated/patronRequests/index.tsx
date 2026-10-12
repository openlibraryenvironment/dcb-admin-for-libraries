import {
	clampPageSize,
	REFERENCE_LIST_PAGE_SIZE,
} from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import { usePatronRequestExport } from "@/hooks/useExport";
import DataGrid from "@components/DataGrid/DataGrid";
import { ExportProgressDialog } from "@components/DataGrid/components/ExportProgressDialog";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { defaultPatronRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/patronRequestColumnVisibility";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import {
	checkIfFiltering,
	processGridFilterModel,
} from "@helpers/dataGrid/utilities";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
} from "@helpers/patronRequestScope";
import { Library } from "@models/Library";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import {
	GridColDef,
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { getLibraries } from "@queries/getLibraries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { getPatronRequestsForExport } from "@queries/getPatronRequestsForExport";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/patronRequests/")({
	head: () => ({ meta: [{ title: pageTitle("nav.patron_requests.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const auth = useAuth();
	const apiRef = useGridApiRef();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const token = auth?.user?.access_token;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${token}`,
		}),
		[token],
	);
	const gridId = "mainPatronRequests";
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
			storedState.pagination ?? { page: 0, pageSize: 25 },
		);

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
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] },
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);
	const isFiltering = checkIfFiltering(filterModel, debouncedFilterModel);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }],
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? defaultPatronRequestColumnVisibility,
	);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setLocalPaginationModel(model);
			setPaginationModel(gridId, model);
		},
		[gridId, setPaginationModel],
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setLocalFilterModel(model);
			setFilterModel(gridId, model);
		},
		[gridId, setFilterModel],
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			setLocalSortModel(model);
			setSortModel(gridId, model);
		},
		[gridId, setSortModel],
	);

	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) => {
			setLocalColumnVisibilityModel(model);
			setColumnVisibilityModel(gridId, model);
		},
		[gridId, setColumnVisibilityModel],
	);

	const { agencyCode: code } = useAgencyCodes();

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["allLibraries", headers, code, dcbApiBase],
		queryFn: async () =>
			request(
				`${dcbApiBase}/graphql`,
				getLibraries,
				{
					query: "",
					pagesize: REFERENCE_LIST_PAGE_SIZE,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				headers,
			),
	});

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
		return standardPatronRequestColumns.map((col) => {
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
			userLibraryHostLmsCode,
			// Both feed the scope this query runs under, so a change to either has to
			// invalidate what was cached against the previous one
			code,
			debouncedFilterModel, // Use debounced filter model
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		queryFn: async () => {
			const baseQuery = borrowedByLibraryQuery(code, userLibraryHostLmsCode);
			const queryVariables = {
				query:
					processGridFilterModel(debouncedFilterModel, baseQuery, [
						"status",
						"description",
					]) ?? "",
				pagesize: clampPageSize(paginationModel.pageSize),
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "dateCreated",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getPatronRequests,
				queryVariables,
				headers,
			);
		},
		// Gated on whatever the scope is actually built from. Under the v9 filter that is
		// the agency claim, which is available immediately; waiting on the Host LMS would
		// hold the grid behind a lookup it no longer needs, and strand a library whose
		// agency has no Host LMS recorded.
		enabled:
			!!token &&
			!!dcbApiBase &&
			hasBorrowingScope(code, userLibraryHostLmsCode),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(
		gridId,
		isPatronRequestError,
		error,
		setLocalFilterModel,
		setLocalSortModel,
		() =>
			setAlert({
				open: true,
				severity: "warning",
				text: t("ui.feedback.error.cannot_process"),
			}),
	);

	// No cleanup here: this grid lists what THIS library borrowed, and cleanup belongs to
	// the library that supplied the request - see supplierRequests.tsx.
	// The export must carry the same scope as the grid - it is the same data leaving
	// the building in a file rather than on screen
	const exportBaseQuery = borrowedByLibraryQuery(code, userLibraryHostLmsCode);
	const { exportProgress, handleExport } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		headers,
		baseQuery: exportBaseQuery,
		exportQuery: getPatronRequestsForExport,
		filterModel: debouncedFilterModel,
		sortModel,
		onExportSuccess: (msg, count) => {
			setAlert({
				open: true,
				severity: "success",
				text: t("ui.data_grid.export.success", { count: count }),
			});
		},
		onExportError: () => {
			setAlert({
				open: true,
				severity: "error",
				text: t("ui.data_grid.export.failed"),
			});
		},
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
		isFiltering ||
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
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="patronRequests"
					label={t("nav.patron_requests.title")}
					identifier="patronRequestsMain"
					checkboxSelection={false}
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
					onExport={handleExport}
					isExporting={exportProgress.isExporting}
				/>
			}
			<ExportProgressDialog
				open={exportProgress.isExporting}
				progress={exportProgress.progress}
				totalRecords={exportProgress.totalRecords}
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
