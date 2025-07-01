import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GridColDef } from "@mui/x-data-grid";
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
import { useAuth as useOidcAuth } from "react-oidc-context"; // OIDC auth for DCB
import { useTranslation } from "react-i18next"; // For error messages
import Error from "@components/Error/Error"; // Import your custom Error component
import { useEffect, useMemo } from "react";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import { getPatronRequests } from "@queries/getPatronRequests";
import request from "graphql-request";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns";
import DataGrid from "@components/DataGrid/DataGrid";

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
			"/api/ill/patronrequests?filters=isRequester==true&sort=dateCreated;desc&stats=true&perPage=100",
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

// --- Component ---
function PatronRequestsComponent() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { cfg } = useRouter().options.context as { cfg: any };
	const oidcAuth = useOidcAuth();
	const {
		logoutILL,
		isILLAuthenticated,
		isLoading: isAuthLoading,
	} = useILLAuth();

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const oidcToken = oidcAuth.user?.access_token;

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${oidcToken}`,
		}),
		[oidcToken]
	);

	const {
		data: dcbData,
		isLoading: isDcbLoading,
		isError: isDcbError,
	} = useQuery<PatronRequestQueryData>({
		queryKey: ["getPatronRequests", dcbApiBase, headers],
		queryFn: () =>
			request(
				`${dcbApiBase}/graphql`, // Use the variable safely
				getPatronRequests,
				{
					query: "",
					pagesize: 10,
					pageno: 0,
					orderBy: "DESC",
					order: "dateCreated",
				},
				headers
			),
		enabled: !!oidcToken && !!dcbApiBase,
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
					/>
				)}
			</Stack>
		</Box>
	);
}
