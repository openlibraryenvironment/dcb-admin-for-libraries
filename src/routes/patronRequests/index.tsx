import { useGridStore } from "@/hooks/useDataGridStore";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import { Typography } from "@mui/material";
import {
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { getLibrary } from "@queries/getLibrary";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/patronRequests/")({
	component: RouteComponent,
});

const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = ""; // Must default to the library specific fromContext and toContext in all situations.
	// we will need more context to infer
	// and we should make this generic - perhaps pass in a preset for each one
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
	const navigate = useNavigate();
	const auth = useAuth();

	const { cfg } = useRouter().options.context as { cfg: any };
	const id = auth.user?.profile?.libraryId;

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const token = auth?.user?.access_token;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth?.user?.access_token}`,
		}),
		[token]
	);
	const gridId = "mainPatronRequests";
	const {
		sortModel: storedSortModel,
		filterModel: storedFilterModel,
		paginationModel: storedPaginationModel,
		setSortModel,
		setFilterModel,
		setPaginationModel,
	} = useGridStore();

	const storedState = {
		sort: storedSortModel[gridId],
		filter: storedFilterModel[gridId],
		pagination: storedPaginationModel[gridId],
	};

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 20 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

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

	const code = auth.user?.profile?.code;

	// Find a way for this not to be needed twice
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", id, headers, code, dcbApiBase],
		queryFn: async () =>
			request(
				`${dcbApiBase}/graphql`,
				getLibrary,
				{
					query: code ? "agencyCode:" + code : "id:" + id, // Prefer to use the full name, but fall back to the ID if needed
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});
	const libraryHostLmsCode =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.code;

	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"getPatronRequests",
			dcbApiBase,
			headers,
			libraryHostLmsCode,
			filterModel,
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
		],
		queryFn: async () => {
			const baseQuery = `patronHostlmsCode:${libraryHostLmsCode}`;
			const queryVariables = {
				query: processMuiFilterModel(filterModel, baseQuery) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
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
		enabled: !!token && !!dcbApiBase && !!libraryHostLmsCode,
		refetchInterval: 10000,
	});
	if (isPatronRequestLoading) {
		return <Loading title="Patron requests loading" subtitle="Please wait" />;
	}
	if (isPatronRequestError) {
		return (
			<Error
				title={t("ui.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.action.go_back")}
				goBack="/"
			/>
		);
	}
	// Persisting column visibility is not working
	// Sort is not working
	// Pagination and persisting it appears to be working
	return (
		<>
			<Typography variant="h5" component="h2" gutterBottom>
				Patron Requests
			</Typography>
			<DataGrid
				rows={patronRequestData?.patronRequests?.content ?? []}
				columns={standardPatronRequestColumns}
				type="patronRequests"
				identifier="patronRequestsMain" // do we still need this now we handle persistence externally?
				checkboxSelection={false}
				disableAggregation={true}
				disableHoverInteractions={true}
				disableRowGrouping={true}
				loading={isPatronRequestLoading}
				listViewEnabled={false}
				noResultsText={t("audit.no_results")}
				pagination
				pivotingEnabled={false}
				toolbarVisible
				searchText="Search by patron request"
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
				rowCount={
					patronRequestData?.patronRequests
						? patronRequestData.patronRequests?.totalSize
						: 0
				}
				rowModesModel={rowModesModel}
			/>
		</>
	);
}
