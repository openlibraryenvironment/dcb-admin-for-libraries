// Updated SharedIndexComponent.tsx (key changes)
import { useRouter, useSearch } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";

import { Route } from "@/routes/__authenticated/indexes/$indexCode";
import { AdvancedSearchFilter } from "./AdvancedSearchFilter";
import { SearchFilter, FilterState } from "@models/SearchTypes";
import { buildQuery } from "@helpers/search/queryBuilder";
import DataGrid from "@components/DataGrid/DataGrid";
import { SearchResult } from "@components/SearchResultComponent/SearchResultComponent";
import Error from "@components/Error/Error";

interface SharedIndexQueryParams {
	filters?: string; // JSON stringified filters
}

// Need to improve:
// Filters in URL
// Presentation when empty (messaging etc)
// Hiding sort buttons + improving grid integrations

// Features to add
// Sorting
// Faceting
// Natural Language search (moonshot)
// Possibly a separate filter panel

export function SharedIndexV2() {
	const { indexCode } = Route.useParams();
	const auth = useAuth();
	const router = useRouter();
	const { cfg } = router.options.context as { cfg: any };
	const { t } = useTranslation();

	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		page: 0,
		pageSize: 25,
	});

	// Get filters from URL search params
	const { filters: filtersParam }: SharedIndexQueryParams = useSearch({
		strict: false,
	});

	// These should be persisted to zustand
	const [filters, setFilters] = useState<SearchFilter[]>(() => {
		if (filtersParam) {
			try {
				const parsed = JSON.parse(filtersParam);
				return parsed.filters || [];
			} catch {
				return [];
			}
		}
		return [];
	});

	// Update URL when filters change
	const handleFiltersChange = useCallback(
		(newFilters: SearchFilter[]) => {
			setFilters(newFilters);

			const filterState: FilterState = { filters: newFilters };
			const filtersJson = JSON.stringify(filterState);

			router.navigate({
				to: "/indexes/$indexCode",
				params: { indexCode: indexCode },
				search: { filters: filtersJson },
				replace: true, // Use replace to avoid cluttering browser history
				// This needs more work as the URL just becomes a big mess
				// I would rather have human-readable filters in the URL, and persist the filters to Zustand
			});
		},
		[router, indexCode]
	);

	const fetchSearchResults = useCallback(
		async ({ queryKey }: any) => {
			const [_, filterState, page, pageSize] = queryKey;

			if (
				!filterState.filters ||
				filterState.filters.length === 0 ||
				!filterState.filters.some((f: SearchFilter) => f.value)
			) {
				return { instances: [], totalRecords: 0 };
			}

			// Build CQL query from filters
			const cqlQuery = buildQuery(
				filterState.filters.filter((f: SearchFilter) => f.value)
			);

			if (!cqlQuery) {
				return { instances: [], totalRecords: 0 };
			}

			console.log("Generated CQL Query:", cqlQuery);

			const response = await axios.get(
				`${cfg.VITE_DCB_SEARCH_BASE}/public/search/instances`,
				{
					headers: {
						Authorization: `Bearer ${auth.user?.access_token}`,
					},
					params: {
						query: cqlQuery,
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
		[auth.user?.access_token, cfg.VITE_DCB_SEARCH_BASE]
	);

	const {
		data: searchResults,
		isLoading,
		isError,
	} = useQuery({
		queryKey: [
			"searchResults",
			{ filters },
			paginationModel.page,
			paginationModel.pageSize,
		],
		queryFn: fetchSearchResults,
		enabled: !!auth.user?.access_token && filters.some((f) => f.value),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// Reset pagination when filters change
	useEffect(() => {
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [filters]);

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
	const columns: GridColDef[] = [
		{
			field: "card",
			flex: 1,
			disableColumnMenu: true,
			renderHeader: () => null,
			renderCell: (params) => (
				<SearchResult params={params} indexCode={indexCode} />
			),
		},
	];

	return (
		<Box sx={{ width: "100%" }}>
			<Stack spacing={2} direction={"column"}>
				<Typography variant="h1" gutterBottom>
					{t("nav.titles.title")}
				</Typography>

				<AdvancedSearchFilter
					onFiltersChange={handleFiltersChange}
					initialFilters={filters}
				/>
				{searchResults?.totalRecords ? (
					<Typography variant="hitCount">
						{t("requesting.titles_found", {
							number: searchResults?.totalRecords,
						})}
					</Typography>
				) : searchResults?.totalRecords == 0 ? (
					<Typography variant="hitCount">
						{t("requesting.titles_found", {
							number: searchResults?.totalRecords,
						})}
					</Typography>
				) : null}
			</Stack>

			{isError && (
				<Error
					title={t("requesting.shared_index.error_connecting_title")}
					message={t("requesting.shared_index.error_connecting")}
					action={t("ui.actions.go_back")}
					goBack="/"></Error>
			)}

			<DataGrid
				rows={searchResults?.instances || []}
				columns={columns}
				pagination
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				rowCount={searchResults?.totalRecords || 0}
				paginationMode="server"
				pivotingEnabled={false}
				loading={isLoading}
				checkboxSelection={false}
				disableHoverInteractions={true} // But we must also specify in style overrides for this case only
				filterMode="server"
				listViewEnabled={false}
				identifier="SharedIndexSearchGrid"
				// getRowId={(row) => row.id}
				// slots={{
				// 	columnHeaders: () => null,
				// 	noRowsOverlay: () => (
				// 		<Box
				// 			sx={{
				// 				display: "flex",
				// 				justifyContent: "center",
				// 				alignItems: "center",
				// 				height: "50%",
				// 			}}>
				// 			{filters.some((f) => f.value)
				// 				? "No results found"
				// 				: "Configure filters above to search"}
				// 		</Box>
				// 	),
				// }}
				// We don't need any of this, happily.
				disableAggregation={true}
				disablePivoting={true}
				disableRowGrouping={true}
				rowModesModel={{}}
				scrollbarVisible={false}
				toolbarVisible={false}
				noResultsText="No results found" // Doesn't seem to be taken into account
				searchText="Select an option and type in your search!"
				sortingMode="server"
				type="SharedIndexSearchGrid"
				// To commit to card layout over grid - disable gridlines - there is probably a better way of doing this
				// This is also how we will separate the cards
				styleOverrides={{
					// Also need to hide sorting indicator FOR NOW - we can provide sorting options later but we must integrate them
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
					// "& .MuiDataGrid-virtualScrollerRenderZone": {
					// 	display: "flex",
					// 	flexDirection: "column",
					// 	rowGap: "16px", // optional: adds clean spacing instead of margins
					// },
					"@media print": {
						".MuiDataGrid-main": { color: "rgba(0, 0, 0, 0.87)" },
					},

					".MuiDataGrid-virtualScroller": {
						overflow: "hidden",
					},
					// both hover styles need to be added, otherwise a flashing effect appears when hovering
					// https://stackoverflow.com/questions/76563478/disable-hover-effect-on-mui-datagrid
					"& .MuiDataGrid-row.Mui-hovered": {
						backgroundColor: "transparent", // Because we are overriding, we must specify these styles also
					},
					"& .MuiDataGrid-row:hover": {
						backgroundColor: "transparent",
					},
					"& .MuiDataGrid-cell:focus": {
						outline: "none",
					},
					"& .MuiDataGrid-detailPanel": {
						overflow: "hidden", // Prevent scrollbars in the detail panel
						height: "auto", // Adjust height automatically
					},
				}}
			/>
		</Box>
	);
}
