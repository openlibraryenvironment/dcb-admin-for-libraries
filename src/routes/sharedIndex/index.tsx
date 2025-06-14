import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CustomLink } from "../../components/CustomLink";
import { useState, useCallback } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import {
	TextField,
	InputAdornment,
	IconButton,
	Box,
	Typography,
	Card,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import {
	DataGridPremium,
	GridColDef,
	GridPaginationModel,
} from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";

import { UserSelectableQuerySpec } from "../../components/Search/UserSelectableQuerySpec";

export const Route = createFileRoute("/sharedIndex/")({
	component: SharedIndexComponent,
});

// Need to be careful with debouncing and not send too many requests.

function SharedIndexComponent() {
	const auth = useAuth(); // can we handle auth in HOC
  const { cfg } = useRouter().options.context as { cfg: any };
	const { t } = useTranslation();

	const [searchTerm, setSearchTerm] = useState("");
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		page: 0,
		pageSize: 25,
	});
	// NEED TO VERIFY AUTH: can we handle in HOC, are we using the correct token (will it persist over refreshes)

	// Why does this need a query key
	const fetchSearchResults = useCallback(
		async ({ queryKey }: any) => {
			// what is this bit actually doings
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const [_, query, page, pageSize] = queryKey;

			if (!query) return { instances: [], totalRecords: 0 };

			const response = await axios.get(
				`${cfg.VITE_DCB_SEARCH_BASE}/public/search/instances`,
				{
					headers: {
						Authorization: `Bearer ${auth.user?.access_token}`,
					},
					params: {
						query: `@keyword all "${query}"`,
						offset: page * pageSize,
						limit: pageSize,
					},
				}
			);

			return {
				instances: response.data.instances || [],
				totalRecords: response.data.totalRecords || 0,
			};
		},
		[auth.user?.access_token]
	);

	const {
		data: searchResults,
		isLoading,
		isError,
	} = useQuery({
		queryKey: [
			"searchResults",
			searchTerm,
			paginationModel.page,
			paginationModel.pageSize,
		],
		queryFn: fetchSearchResults,
		enabled: !!searchTerm && !!auth.user?.access_token,
		// keepPreviousData: true, // invesstigate this - it's causing a type error
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const debouncedSearch = useCallback((term: string, type: string) => {
		setSearchTerm(term);
		// Reset pagination when search term changes
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const handleSearch = (qry: string, type: string) => {
    console.log("handleSearch %s %s",qry,type);
		debouncedSearch(qry,type);
	};

	const columns: GridColDef[] = [
		{
			field: "title",
			headerName: "Title",
			minWidth: 300,
			flex: 0.7,
		},
		{
			field: "id",
			headerName: "Cluster ID",
			minWidth: 100,
			flex: 0.5,
			renderCell: (params) => (
				<CustomLink
					to="/sharedIndex/$id/cluster"
					params={{ id: params.row.id }}>
					{params.row.id}
				</CustomLink>
			),
		},
		{
			field: "items",
			headerName: "Items",
			minWidth: 100,
			flex: 0.3,
			renderCell: (params) => (
				<CustomLink to="/sharedIndex/$id/items" params={{ id: params.row.id }}>
					View Items
				</CustomLink>
			),
		},
		{
			field: "identifiers",
			headerName: "Identifiers",
			minWidth: 100,
			flex: 0.3,
			renderCell: (params) => (
				<CustomLink
					to="/sharedIndex/$id/identifiers"
					params={{ id: params.row.id }}>
					Identifiers
				</CustomLink>
			),
		},
	];

	return (
		<Box sx={{ width: "100%" }}>
			<Typography variant="h4" component="h1" gutterBottom>
				{t("shared_index.title")}
			</Typography>
			{/* <LanguageSwitcher /> */}

			<UserSelectableQuerySpec searchTerm={searchTerm} handleSearch={handleSearch} />

			{isError && (
				<Card sx={{ p: 4, textAlign: "center", my: 2 }}>
					<Typography variant="h6">Error</Typography>
					<Typography>
						There was an issue connecting to the search service. Please try
						again later.
					</Typography>
				</Card>
			)}

			<DataGridPremium
				rows={searchResults?.instances || []}
				columns={columns}
				pagination
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				pageSizeOptions={[10, 25, 50, 100, 200]}
				rowCount={searchResults?.totalRecords || 0}
				paginationMode="server"
				loading={isLoading}
				autoHeight
				getRowId={(row) => row.id}
				sx={{ border: 0 }}
				slots={{
					noRowsOverlay: () => (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%",
								p: 2,
							}}>
							{searchTerm ? "No results found" : "Enter a search term to begin"}
						</Box>
					),
				}}
				disableAggregation={true}
				disableRowGrouping={true}
			/>
		</Box>
	);
}
