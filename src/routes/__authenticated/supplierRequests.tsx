import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import {
	defaultPatronRequestColumnVisibility,
	standardPatronRequestColumns,
} from "@helpers/dataGrid/columns";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
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

// This can now just use supplying agency code filter
// This should go into its own helper function
const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = "";
	if (columnFilterQueries.length > 0) {
		finalQuery = `(${columnFilterQueries.join(` ${logicOperator.toUpperCase()} `)})`;
	}

	if (quickFilterValues.length > 0) {
		const quickFilterQuery = quickFilterValues
			.map(
				(val) =>
					`(fromValue:*${val}* OR toValue:*${val}* OR fromCategory:*${val}* OR toCategory:*${val}*)`
			)
			.join(" AND ");

		if (finalQuery) {
			finalQuery += ` AND (${quickFilterQuery})`;
		} else {
			finalQuery = quickFilterQuery;
		}
	}

	if (baseQuery) {
		return finalQuery ? `${baseQuery} AND (${finalQuery})` : baseQuery;
	}
	return finalQuery;
};

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
		storedState.columnVisibility ?? defaultPatronRequestColumnVisibility
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
			"getPatronRequestsByIds",
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
			const additionalFilters = processMuiFilterModel(
				debouncedFilterModel,
				presetQuery
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
			<DataGrid
				disablePivoting
				rows={patronRequestData?.patronRequests?.content ?? []}
				columns={standardPatronRequestColumns}
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
		</>
	);
}
