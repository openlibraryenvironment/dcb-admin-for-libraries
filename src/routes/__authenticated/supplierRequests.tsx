import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import { usePatronRequestExport } from "@/hooks/useExport";
import { usePatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";
import { CleanupProgressDialog } from "@components/DataGrid/components/CleanupProgressDialog";
import { ExportProgressDialog } from "@components/DataGrid/components/ExportProgressDialog";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { standardSupplierRequestColumns } from "@helpers/dataGrid/columns/supplierRequestColumns";
import { defaultSupplierRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/supplierRequestColumnVisibility";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
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
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/supplierRequests")({
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
		[token],
	);
	const apiRef = useGridApiRef();

	const gridId = "supplierPatronRequests";
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
			storedState.pagination ?? { page: 0, pageSize: 25 },
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] },
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }],
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? defaultSupplierRequestColumnVisibility,
	);

	const [isFiltering, setIsFiltering] = useState(false);

	useEffect(() => {
		const hasActiveFilters =
			filterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null,
			) ||
			(filterModel.quickFilterValues &&
				filterModel.quickFilterValues.length > 0);

		// const hasActiveDebounceFilters =
		// 	debouncedFilterModel.items.some(
		// 		(item) => item.value && item.value !== "" && item.value !== null
		// 	) ||
		// 	(debouncedFilterModel.quickFilterValues &&
		// 		debouncedFilterModel.quickFilterValues.length > 0);

		const isDifferent =
			JSON.stringify(filterModel) !== JSON.stringify(debouncedFilterModel);
		setIsFiltering(!!hasActiveFilters && isDifferent);
	}, [filterModel, debouncedFilterModel]);

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

	const code = auth.user?.profile?.code;

	const presetQuery = "supplyingAgencyCode:" + code;

	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
		refetch,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"getSupplierRequestsByIds",
			dcbApiBase,
			headers,
			debouncedFilterModel,
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
			presetQuery,
		],
		queryFn: async () => {
			const additionalFilters = processGridFilterModel(
				debouncedFilterModel,
				presetQuery,
				["status", "description"],
			);
			const finalQuery = additionalFilters
				? `(${presetQuery}) AND (${additionalFilters})`
				: presetQuery;

			const queryVariables = {
				query: finalQuery,
				pagesize: paginationModel.pageSize,
				pageno: paginationModel.page, // Use actual page number now
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
		enabled: !!token && !!dcbApiBase && !!code,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	const { data: librariesData } = useQuery<LibrariesQueryData>({
		queryKey: ["allLibraries", headers, dcbApiBase],
		queryFn: async () =>
			request(
				`${dcbApiBase}/graphql`,
				getLibraries,
				{
					query: "",
					pagesize: 10000,
					pageno: 0,
					orderBy: "DESC",
					order: "fullName",
				},
				headers,
			),
		enabled: !!token && !!dcbApiBase,
		refetchOnWindowFocus: false,
	});

	const libraries = librariesData?.libraries?.content ?? [];

	const libraryHostLmsOptions = useMemo(() => {
		if (!libraries) return [];
		return libraries
			.filter((lib: Library) => lib?.agency?.hostLms?.code) // Libraries must have a Host LMS code
			.map((lib: Library) => ({
				value: lib.agency.hostLms.code,
				label: lib.fullName,
			}));
	}, [libraries]);

	const dynamicColumns = useMemo(() => {
		const targetField = "patronHostlmsCode";

		return standardSupplierRequestColumns.map((col) => {
			if (col.field === targetField) {
				const { ...baseColProps } = col;

				const selectCol: GridColDef = {
					...baseColProps,
					type: "singleSelect",
					valueOptions: libraryHostLmsOptions,
					filterOperators: undefined, // Reset operators to allow singleSelect defaults
				};
				return selectCol;
			}
			return col;
		});
	}, [libraryHostLmsOptions]);

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
				text: t("ui.feedback.cannot_process"),
			}),
	);

	const { cleanupState, handleCleanup, handleCloseCleanup } =
		usePatronRequestCleanup({
			apiRef,
			dcbApiBase,
			headers,
			onSuccess: () => {
				refetch();
			},
		});
	const { exportProgress, handleExport } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		headers,
		baseQuery: presetQuery,
		exportQuery: getPatronRequestsForExport,
		filterModel: debouncedFilterModel,
		sortModel,
		onExportSuccess: (msg, count) => {
			console.log(msg);
			setAlert({
				open: true,
				severity: "success",
				text: t("ui.data_grid.export.success", { count: count }),
			});
		},
		onExportError: (msg) => {
			console.log(msg);
			setAlert({
				open: true,
				severity: "error",
				text: t("ui.data_grid.export.failed"),
			});
		},
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
		console.log(error, isPatronRequestError);
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
		isFiltering ||
		isPatronRequestLoading ||
		(isFetching && !!patronRequestData);
	return (
		<>
			{
				<DataGrid
					disablePivoting
					rows={patronRequestData?.patronRequests?.content ?? []}
					columns={dynamicColumns}
					columnVisibilityModel={columnVisibilityModel}
					checkboxSelection={true}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="patronRequests"
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
					searchText="Search supplier patron requests"
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
					rowCount={patronRequestData?.patronRequests?.totalSize ?? 0}
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
					enableCleanup={true}
					onCleanup={handleCleanup}
					onExport={handleExport}
					isExporting={exportProgress.isExporting}
					parentApiRef={apiRef}
				/>
			}
			<ExportProgressDialog
				open={exportProgress.isExporting}
				progress={exportProgress.progress}
				totalRecords={exportProgress.totalRecords}
			/>
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
				onClose={handleCloseCleanup}
			/>

			{
				<TimedAlert
					open={alert.open}
					onCloseFunc={handleSnackbarClose}
					severityType={alert.severity}
					// variant="filled"
					// sx={{ width: "100%" }}
					autoHideDuration={6000}
					alertText={alert.text}></TimedAlert>
			}
		</>
	);
}
