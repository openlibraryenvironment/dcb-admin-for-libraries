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
import { Button } from "@mui/material";

import { Route } from "@/routes/__authenticated/indexes/$indexCode";
import { AdvancedSearchFilter } from "./AdvancedSearchFilter";
import { SearchField, SearchFilter } from "@models/SearchTypes";
import { buildQuery } from "@helpers/search/queryBuilder";
import DataGrid from "@components/DataGrid/DataGrid";
import { SearchResult } from "@components/SearchResultComponent/SearchResultComponent";
import Error from "@components/Error/Error";
import { useSearchGridStore } from "@/hooks/useSearchGridStore";
import { parseQuery } from "@helpers/search/queryParser";

interface SharedIndexQueryParams {
	filters?: string; // JSON stringified filters
}

// Need to improve:
// Filters in URL look horrible. Can we have a nicer URL and a filter store in zustand?
// Presentation when empty (messaging etc)
// Hiding sort buttons + improving grid integrations
// Searches should really only run on Enter or Search

// Features to add
// Sorting
// Faceting
// Natural Language search (moonshot)
// Suggestions
// Possibly a separate filter panel

const createDefaultFilter = (): SearchFilter => ({
	id: Date.now().toString(),
	field: SearchField.Title,
	value: "",
});

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

	// Get the simplified query from URL search params
	const { filters: queryParam }: SharedIndexQueryParams = useSearch({
		strict: false,
	});

	// Get state from Zustand store
	const { appliedFilters, setAppliedFilters } = useSearchGridStore();

	// This state holds the "current" filters being edited in the UI
	const [stagedFilters, setStagedFilters] = useState<SearchFilter[]>([]);
	const [isDirty, setIsDirty] = useState(false); // State to track if filters have changed
	const [isAdvancedMode, setIsAdvancedMode] = useState(false); // <-- State for mode

	// On initial load, synchronize state from the URL
	useEffect(() => {
		const initialFilters = parseQuery(queryParam || "");
		setAppliedFilters(initialFilters);
		setStagedFilters(initialFilters);
	}, [queryParam, setAppliedFilters]); // Dependency on queryParam ensures this runs on URL change

	// Compare staged and applied filters to determine if UI is "dirty"
	useEffect(() => {
		// A simple deep comparison using JSON.stringify
		const staged = JSON.stringify(stagedFilters.filter((f) => f.value));
		const applied = JSON.stringify(appliedFilters.filter((f) => f.value));
		setIsDirty(staged !== applied);
	}, [stagedFilters, appliedFilters]);

	const handleApplyFilters = useCallback(
		(newFilters: SearchFilter[]) => {
			const activeFilters = newFilters.filter((f) => f.value);
			setAppliedFilters(activeFilters);

			// Build the simple query for the URL
			const simpleQuery = buildQuery(activeFilters);

			router.navigate({
				to: "/indexes/$indexCode",
				params: { indexCode: indexCode },
				search: { filters: simpleQuery }, // Use the simple query in the URL
				replace: true,
			});
		},
		[router, indexCode, setAppliedFilters]
	);

	const handleSearchSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		handleApplyFilters(stagedFilters);
	};
	const toggleAdvancedMode = () => {
		setIsAdvancedMode((prev) => {
			const nextMode = !prev;
			// If switching from advanced to simple, keep only the first filter
			if (!nextMode) {
				setStagedFilters((currentFilters) => [
					currentFilters[0] || createDefaultFilter(),
				]);
			}
			return nextMode;
		});
	};

	const fetchSearchResults = useCallback(
		async ({ queryKey }: any) => {
			// Need this
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const [_, query] = queryKey;

			if (!query) {
				return { instances: [], totalRecords: 0 };
			}

			console.log("Generated Query:", query);

			const response = await axios.get(
				`${cfg.VITE_DCB_SEARCH_BASE}/public/search/instances`,
				{
					headers: {
						Authorization: `Bearer ${auth.user?.access_token}`,
					},
					params: {
						query: query, // The query is now directly from the URL
						offset: paginationModel.page * paginationModel.pageSize,
						limit: paginationModel.pageSize,
					},
				}
			);

			return {
				instances: response.data.instances || [],
				totalRecords: response.data.totalRecords || 0,
			};
		},
		[
			auth.user?.access_token,
			cfg.VITE_DCB_SEARCH_BASE,
			paginationModel.page,
			paginationModel.pageSize,
		]
	);

	const {
		data: searchResults,
		isLoading,
		isError,
	} = useQuery({
		queryKey: [
			"searchResults",
			queryParam, // Query depends directly on the URL param
			paginationModel.page,
			paginationModel.pageSize,
		],
		queryFn: fetchSearchResults,
		enabled: !!auth.user?.access_token && !!queryParam,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// Reset pagination when the query changes
	useEffect(() => {
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [queryParam]);

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
				{/* Can we use react-hook-form here */}
				<form onSubmit={handleSearchSubmit}>
					<AdvancedSearchFilter
						filters={stagedFilters}
						onFiltersChange={setStagedFilters}
						isAdvancedMode={isAdvancedMode}
					/>
					<Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
						{isAdvancedMode ? (
							<Button
								type="submit"
								variant="contained"
								color="primary"
								disabled={!isDirty}>
								{t("ui.actions.apply_filters")}
							</Button>
						) : (
							<Button
								type="submit"
								variant="contained"
								color="primary"
								disabled={!stagedFilters[0]?.value?.trim()}>
								{t("ui.actions.search")}
							</Button>
						)}
						<Button variant="outlined" onClick={toggleAdvancedMode}>
							{isAdvancedMode
								? t("ui.actions.hide_advanced_search")
								: t("ui.actions.show_advanced_search")}
						</Button>
					</Stack>
				</form>

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
				autoRowHeight
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
						borderBottom: "none", // These 2 remove the row borders
						borderTop: "none",
						marginBottom: "32px", // To add space between cards
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
