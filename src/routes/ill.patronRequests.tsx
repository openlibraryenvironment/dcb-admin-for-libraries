import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	GridColDef,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
} from "@mui/x-data-grid";
import {
	Box,
	CircularProgress,
	Typography,
	Button,
	Toolbar,
	AppBar,
	Stack,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useILLAuth } from "../lib/illAuth";
import { useAuth, useAuth as useOidcAuth } from "react-oidc-context"; // OIDC auth for DCB
import { useTranslation } from "react-i18next"; // For error messages
import Error from "@components/Error/Error"; // Import your custom Error component
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import { getPatronRequests } from "@queries/getPatronRequests";
import request from "graphql-request";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns";
import DataGrid from "@components/DataGrid/DataGrid";
import { useGridStore } from "@/hooks/useDataGridStore";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import { getLibrary } from "@queries/getLibrary";

interface ILLPatronRequest {
	id: string;
	hrid: string;
	title: string | null;
	author: string | null;
	patronIdentifier: string;
	state: {
		code: string;
	};
	lastUpdated: string;
}
interface IllApiResponse {
	results: ILLPatronRequest[];
	totalRecords: number;
}

// --- Data Fetching Options ---

// For ILL Requests (uses HttpOnly cookie)
const illPatronRequestsQueryOptions = {
	queryKey: ["illPatronRequests"],
	queryFn: async (): Promise<IllApiResponse> => {
		const response = await fetch(
			`${import.meta.env.VITE_ILL_API_BASE}/ill/patronrequests?filters=isRequester==true&sort=dateCreated;desc&stats=true&perPage=100`,
			// "/{api}/ill/patronrequests?filters=isRequester==true&sort=dateCreated;desc&stats=true&perPage=100",
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"X-Okapi-Tenant": "ill",
				},
				credentials: "include",
			}
		);
		if (response.status === 401 || response.status === 403) {
			// Throw a specific error for auth failure that we can catch
			console.error("ILL_AUTH_FAILURE"); // need to flag this
		}
		if (response.status == 400) {
			console.error("ILL_BAD_REQUEST");
		}
		if (!response.ok) {
			const errorBody = await response.text();
			console.error(
				`Failed to fetch ILL requests: ${response.status} ${errorBody}`
			);
		}
		return response.json();
	},
};

// --- Route Definition ---
export const Route = createFileRoute("/ill/patronRequests")({
	// We only pre-fetch the ILL data now, as DCB data needs client-side context.
	loader: ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData(illPatronRequestsQueryOptions);
	},
	component: PatronRequestsComponent,
});

const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = ""; // Must default to the library specific host lms in all situations.
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

// --- Component ---
function PatronRequestsComponent() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const auth = useAuth();

	const { cfg } = useRouter().options.context as { cfg: any };
	const oidcAuth = useOidcAuth();
	const {
		logoutILL,
		isILLAuthenticated,
		isLoading: isAuthLoading,
	} = useILLAuth();
	const id = auth.user?.profile?.libraryId;

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const oidcToken = oidcAuth.user?.access_token;

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${oidcToken}`,
		}),
		[oidcToken]
	);

	const gridId = "combinedPatronRequests";
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
		data: dcbData,
		isLoading: isDcbLoading,
		isError: isDcbError,
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
		enabled: !!oidcToken && !!dcbApiBase && !!libraryHostLmsCode,
		refetchInterval: 10000,
	});

	const {
		data: illData,
		isLoading: isIllLoading,
		isError: isIllError,
	} = useQuery(illPatronRequestsQueryOptions);

	useEffect(() => {
		if (!isAuthLoading && !isILLAuthenticated) {
			// Need to make sure this doesn't accidentally catch the first redirect to /patronRequests
			navigate({ to: "/ill/login", replace: true });
		}
	}, [isAuthLoading, isILLAuthenticated, navigate]);
	console.log("ILL error?", isIllError);
	useEffect(() => {
		if (isIllError) {
			logoutILL();
			navigate({ to: "/ill/login", replace: true });
		}
	}, [isIllError, logoutILL]);

	// --- Column Definitions ---

	const illColumns: GridColDef<ILLPatronRequest>[] = [
		{ field: "hrid", headerName: "Request ID", width: 150 },
		{
			field: "title",
			headerName: "Title",
			flex: 1,
			minWidth: 250,
			valueGetter: (value, row) => row.title || "N/A",
		},
		{
			field: "author",
			headerName: "Author",
			flex: 1,
			minWidth: 200,
			valueGetter: (value, row) => row.author || "N/A",
		},
		{ field: "patronIdentifier", headerName: "Patron", width: 150 },
		{
			field: "state",
			headerName: "Status",
			width: 200,
			valueGetter: (_value, row) => row.state.code,
		},
		{
			field: "lastUpdated",
			headerName: "Last Updated",
			width: 200,
			type: "dateTime",
			valueGetter: (_value, row) => new Date(row.lastUpdated),
		},
	];

	// Various loading or error statess
	if (isAuthLoading) {
		return <CircularProgress />;
	}

	if (isIllError) {
		return (
			<Error
				title={t("ui.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.action.go_back")}
				goBack="/ill/login"
			/>
		);
	}

	if (isDcbError) {
		return (
			<Error
				title={t("ui.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.action.go_back")}
				goBack="/ill/patronRequests"
			/>
		);
	}
	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "calc(100vh - 120px)",
			}}>
			<AppBar position="static" color="default">
				<Toolbar>
					<Typography variant="h6" sx={{ flexGrow: 1 }}>
						Patron Requests
					</Typography>
					<Button
						color="inherit"
						onClick={logoutILL}
						startIcon={<LogoutIcon />}>
						Logout from ILL
					</Button>
				</Toolbar>
			</AppBar>

			<Stack spacing={2} direction={"column"} sx={{ mt: 4 }}>
				{/* DCB Requests Section */}
				<Typography variant="h5" component="h2" gutterBottom>
					DCB Requests
				</Typography>
				{dcbData && (
					<DataGrid
						rows={dcbData.patronRequests?.content ?? []}
						columns={standardPatronRequestColumns}
						type="PatronRequest"
						identifier="patronRequestsDCB-ILL"
						checkboxSelection={false}
						disableAggregation={true}
						disableHoverInteractions={true}
						disableRowGrouping={true}
						loading={isDcbLoading}
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
							dcbData.patronRequests ? dcbData.patronRequests?.totalSize : 0
						}
						rowModesModel={rowModesModel}
					/>
				)}

				{/* ILL Requests Section */}
				<Typography variant="h5" component="h2" gutterBottom>
					ILL Requests
				</Typography>
				{isIllLoading && <CircularProgress sx={{ m: 2 }} />}
				{illData && (
					<DataGrid
						rows={illData.results}
						columns={illColumns}
						type="ILLRequest"
						identifier="ILL-requests"
						checkboxSelection={false}
						disableAggregation={true}
						disableHoverInteractions={true}
						disableRowGrouping={true}
						loading={isIllLoading}
						listViewEnabled={false}
						noResultsText={t("audit.no_results")}
						pagination
						pivotingEnabled={false}
						toolbarVisible
						searchText="Search by patron request"
						scrollbarVisible={false}
						filterMode="client"
						sortingMode="client"
						sortModel={[{ field: "title", sort: "desc" }]}
						paginationMode="client"
						paginationModel={{ page: 0, pageSize: 25 }}
						rowCount={illData.totalRecords}
						rowModesModel={{}}
					/>
				)}
			</Stack>
		</Box>
	);
}
