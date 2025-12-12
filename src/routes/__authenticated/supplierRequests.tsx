import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import {
	defaultSupplierRequestColumnVisibility,
	standardSupplierRequestColumns,
} from "@helpers/dataGrid/columns";
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
} from "@mui/x-data-grid-premium";
import { getLibraries } from "@queries/getLibraries";
import { getPatronRequests } from "@queries/getPatronRequests";
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
		[token]
	);

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
		storedState.columnVisibility ?? defaultSupplierRequestColumnVisibility
	);

	const [isFiltering, setIsFiltering] = useState(false);

	useEffect(() => {
		const hasActiveFilters =
			filterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null
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

	const code = auth.user?.profile?.code;

	const presetQuery = "supplyingAgencyCode:" + code;

	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
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
				["status", "description"]
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
				headers
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
				headers
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
		() => setSnackbarOpen(true)
	);

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
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="patronRequests"
					identifier="supplierPatronRequests"
					checkboxSelection={false}
					disableAggregation={true}
					disableHoverInteractions={true}
					disableRowGrouping={true}
					loading={shouldShowLoading}
					listViewEnabled={false}
					noResultsText={t("patron_requests.no_results")}
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
