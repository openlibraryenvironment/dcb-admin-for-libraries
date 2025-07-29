import { useRouter, useSearch } from "@tanstack/react-router";
import { CustomLink } from "../CustomLink";
import { useState, useCallback } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
	DataGridPremium,
	GridColDef,
	GridPaginationModel,
} from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";

import { UserSelectableQuerySpec } from "../Search/UserSelectableQuerySpec";
import { Route } from "@/routes/__authenticated/indexes/$indexCode";

interface SharedIndexQueryParams {
	q: string;
	qt: string;
}

export function SharedIndexComponent() {
	const { indexCode } = Route.useParams();

	const auth = useAuth(); // can we handle auth in HOC
	const router = useRouter();
	const { cfg } = router.options.context as { cfg: any };
	const { t } = useTranslation();

	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		page: 0,
		pageSize: 25,
	});

	// When the page is rendered, see if we have any query params
	const { q, qt }: SharedIndexQueryParams = useSearch({ strict: false });

	// console.log("params: %s %s", q, qt);

	if (!indexCode) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "80vh",
				}}>
				<CircularProgress />
			</Box>
		);
	}

	// NEED TO VERIFY AUTH: can we handle in HOC, are we using the correct token (will it persist over refreshes)

	// Why does this need a query key
	const fetchSearchResults = useCallback(
		async ({ queryKey }: any) => {
			if (q == null || qt == null) {
				console.log("Bailing - no type or term");
				return;
			}

			// what is this bit actually doings
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const [_, query, queryType, page, pageSize] = queryKey;

			if (!query) return { instances: [], totalRecords: 0 };

			// console.log("qry: %o %s, type:%s",queryKey, query,queryType);

			const response = await axios.get(
				`${cfg.VITE_DCB_SEARCH_BASE}/public/search/instances`,
				{
					headers: {
						Authorization: `Bearer ${auth.user?.access_token}`,
					},
					params: {
						query: query,
						queryType: queryType,
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
		[auth.user?.access_token, q, qt]
	);

	const {
		data: searchResults,
		isLoading,
		isError,
	} = useQuery({
		queryKey: [
			"searchResults",
			q,
			qt,
			paginationModel.page,
			paginationModel.pageSize,
		],
		queryFn: fetchSearchResults,
		enabled: !!q && !!auth.user?.access_token,
		// keepPreviousData: true, // invesstigate this - it's causing a type error
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const handleSearch = (qry: string, type: string) => {
		// console.log("handleSearch %s %s",qry,type);
		// debouncedSearch(qry,type);
		// Instead of directly searching, we navigate to a URL so the search becomes bookmarkable
		// useSearch above will then retrieve the necessary parameters and run the search for us
		router.navigate({
			to: "/indexes/$indexCode",
			params: { indexCode: indexCode },
			search: { q: qry, qt: type },
		});
	};

	const columns: GridColDef[] = [
		{
			field: "card",
			flex: 1,
			disableColumnMenu: true,
			renderCell: (params) => (
				<Box width="100%" mb={2} p={0} m={0}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="h6">
								<CustomLink
									to="/indexes/$indexCode/$recordId"
									params={{ indexCode: indexCode, recordId: params.row.id }}>
									{params.row.title}
								</CustomLink>
							</Typography>
							<Typography variant="body2">{params.row.description}</Typography>
							<Typography variant="body2" color="text.secondary" mb={2}>
								{params.row.sourceTypes?.join(",")} &nbsp;
								{params.row.publication
									?.map(
										(pub: { publisher: string; dateOfPublication: string }) =>
											pub.publisher + " " + pub.dateOfPublication
									)
									.join(", ")}
							</Typography>
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								mb={2}>
								{params.row.subjects?.map(
									(sub: { value: string }, index: bigint) => (
										<Chip
											key={params.row.id + "." + index + "." + sub.value}
											label={sub.value}
										/>
									)
								)}
							</Stack>
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								mb={2}>
								{params.row.isbns?.map((isbn: string, index: bigint) => (
									<Chip
										key={params.row.id + "." + index + "." + isbn}
										label={`isbn ${isbn}`}
									/>
								))}
								{params.row.issns?.map((issn: string, index: bigint) => (
									<Chip
										key={params.row.id + "." + index + "." + issn}
										label={`issn ${issn}`}
									/>
								))}
							</Stack>
						</CardContent>
					</Card>
				</Box>
			),

			//renderCell: (params) => (
			//<CustomLink to="/indexes/$indexCode/$recordId" params={{ indexCode:indexCode, recordId: params.row.id }}>
			//  {params.row.title}
			//</CustomLink>
			//),
		},
		/*
        {
            field: "title",
            headerName: "Title",
            minWidth: 300,
            flex: 0.7,
            renderCell: (params) => (
            <CustomLink to="/indexes/$indexCode/$recordId" params={{indexCode: "wibble", recordId:"123"}}>
              {params.row.title}
            </CustomLink>
            ),

            //renderCell: (params) => (
              //<CustomLink to="/indexes/$indexCode/$recordId" params={{ indexCode:indexCode, recordId: params.row.id }}>
              //  {params.row.title}
              //</CustomLink>
            //),
        },
        */
	];

	return (
		<Box sx={{ width: "100%" }}>
			<Typography variant="h1" gutterBottom>
				{t("nav.titles.title")}
			</Typography>
			{/* <LanguageSwitcher /> */}

			<UserSelectableQuerySpec searchTerm={q} handleSearch={handleSearch} />

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
				disablePivoting
				rows={searchResults?.instances || []}
				columns={columns}
				pagination
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				pageSizeOptions={[10, 25, 50, 100, 200]}
				rowCount={searchResults?.totalRecords || 0}
				// Let rows expand to contain cards
				getRowHeight={() => "auto"}
				autoHeight
				paginationMode="server"
				loading={isLoading}
				getRowId={(row) => row.id}
				slots={{
					// Turn off column heads
					columnHeaders: () => null,
					noRowsOverlay: () => (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "50%",
								// p: 2,
							}}>
							{q ? "No results found" : "Enter a search term to begin"}
						</Box>
					),
				}}
				disableAggregation={true}
				disableRowGrouping={true}
				// To commit to card layout over grid - disable gridlines
				sx={{
					"& .MuiDataGrid-columnSeparator": { display: "none" },
					"& .MuiDataGrid-cell": {
						borderBottom: "none",
						borderTop: "none",
						padding: 0,
					},
					border: "none",
					"& .MuiDataGrid-row": {
						borderBottom: "none", // Remove row borders (some versions use this)
						borderTop: "none", // Remove row borders (some versions use this)
					},
					"& .MuiDataGrid-virtualScrollerRenderZone": {
						display: "flex",
						flexDirection: "column",
						rowGap: "16px", // optional: adds clean spacing instead of margins
					},
				}}
			/>
		</Box>
	);
}
