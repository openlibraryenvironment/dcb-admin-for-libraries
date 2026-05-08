import { useRouter, useSearch } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
// import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";
import {
	Button,
	Dialog,
	DialogTitle,
	IconButton,
	Menu,
	MenuItem,
} from "@mui/material";

// import { Route } from "@/routes/__authenticated/requesting";
import { AdvancedSearchFilter } from "./AdvancedSearchFilter";
import { SearchField, SearchFilter } from "@models/SearchTypes";
import { buildQuery } from "@helpers/search/queryBuilder";
import DataGrid from "@components/DataGrid/DataGrid";
import { SearchResult } from "@components/SearchResultComponent/SearchResultComponent";
import Error from "@components/Error/Error";
import { useSearchGridStore } from "@/hooks/useSearchGridStore";
import { parseQuery } from "@helpers/search/queryParser";
import { validate } from "uuid";
import { ChecklistRounded, Close } from "@mui/icons-material";
import QuickWalkUpRequest from "@forms/QuickWalkUp/QuickWalkUp";

interface SharedIndexQueryParams {
	filters?: string; // JSON stringified filters
	pageno?: number;
	pagesize?: number;
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
	// const { indexCode } = Route.useParams();
	const auth = useAuth();
	const router = useRouter();
	const { cfg } = router.options.context as { cfg: any };
	const { t } = useTranslation();

	// Get the simplified query from URL search params
	// We should really store the queryType in the URL
	const {
		filters: queryParam,
		pageno = 0,
		pagesize = 25,
	}: SharedIndexQueryParams = useSearch({
		strict: false,
	});
	// Cards still cut off

	// Get state from Zustand store
	const { appliedFilters, setAppliedFilters } = useSearchGridStore();
	// But keep pagination in URL only for now because of weird conflicts.
	const paginationModel: GridPaginationModel = {
		page: pageno,
		pageSize: pagesize,
	};

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		// setPaginationModel(newModel);
		router.navigate({
			to: "/requesting",
			// params: { indexCode: indexCode },
			search: {
				filters: queryParam, // Keep the existing search filters
				pageno: newModel.page,
				pagesize: newModel.pageSize,
			},
			replace: true, // Use replace to avoid adding a new entry to the browser's history
		});
	};

	// This state holds the "current" filters being edited in the UI
	const [stagedFilters, setStagedFilters] = useState<SearchFilter[]>([
		createDefaultFilter(),
	]);

	const [isDirty, setIsDirty] = useState(false); // State to track if filters have changed
	const [isAdvancedMode, setIsAdvancedMode] = useState(false); // <-- State for mode

	const isAdvancedSearchAvailable =
		stagedFilters[0].field !== SearchField.ClusterRecordID;

	const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
	const isMenuOpen = Boolean(menuAnchorEl);
	const [showModal, setShowModal] = useState(false);

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setMenuAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setMenuAnchorEl(null);
	};

	const handleQuickWalkUpClick = () => {
		handleMenuClose();
		setShowModal(true);
	};

	// On initial load, synchronize state from the URL
	// Dependency on queryParam ensures this runs on URL change

	useEffect(() => {
		const initialFilters = parseQuery(queryParam || "");

		// If parsing the URL results in an empty array, use a default filter instead.
		const filtersToSet =
			initialFilters.length > 0 ? initialFilters : [createDefaultFilter()];

		setAppliedFilters(filtersToSet);
		setStagedFilters(filtersToSet);
		if (filtersToSet.length > 1) {
			setIsAdvancedMode(true);
		}
	}, [queryParam, setAppliedFilters]);
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
				to: "/requesting",
				// params: { indexCode: indexCode },
				search: {
					filters: simpleQuery,
					pagesize: paginationModel.pageSize,
					pageno: paginationModel.page,
				}, // Use the simple query in the URL
				replace: true,
			});
		},
		[router, setAppliedFilters],
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

			const [_, query, pageno, pagesize] = queryKey;
			const isUUID = query.length === 36 ? validate(query) : false;

			if (!query) {
				return { instances: [], totalRecords: 0 };
			}

			// console.log("Generated Query:", query);
			let url: string;
			let params: Record<string, any>;

			// Conditional URL and params logic
			if (isUUID) {
				// If searching by Cluster Record ID, use the specific instance endpoint
				url = `${cfg.VITE_DCB_SEARCH_BASE}/public/opac-inventory/instances/${query}`;
				params = {
					limit: 25,
				};
			} else {
				// Otherwise, use the general search endpoint
				url = `${cfg.VITE_DCB_SEARCH_BASE}/search/instances`;
				params = {
					query: query,
					// queryType: queryType,
					offset: pageno * pagesize,
					limit: pagesize,
				};
			}
			const response = await axios.get(url, {
				headers: {
					Authorization: `Bearer ${auth.user?.access_token}`,
				},
				params: params,
			});

			// const response = await axios.get(
			// 	`${cfg.VITE_DCB_SEARCH_BASE}/public/search/instances`,
			// 	{
			// 		headers: {
			// 			Authorization: `Bearer ${auth.user?.access_token}`,
			// 		},
			// 		params: {
			// 			query: query, // The query is now directly from the URL
			// 			offset: paginationModel.page * paginationModel.pageSize,
			// 			limit: paginationModel.pageSize,
			// 		},
			// 	}
			// );
			if (isUUID && response.data) {
				return {
					instances: [response.data], // Wrap single object in an array
					totalRecords: 1,
				};
			} else {
				return {
					instances: response.data.instances || [],
					totalRecords: response.data.totalRecords || 0,
				};
			}
		},
		[
			auth.user?.access_token,
			cfg.VITE_DCB_SEARCH_BASE,
			paginationModel.page, // pageno
			paginationModel.pageSize, // pagesize
		],
	);

	const {
		data: searchResults,
		isLoading,
		isFetching,
		isError,
	} = useQuery({
		queryKey: [
			"searchResults",
			queryParam, // Query depends directly on the URL param
			pageno,
			pagesize,
		],
		queryFn: fetchSearchResults,
		enabled: !!auth.user?.access_token && !!queryParam,
		staleTime: 1000 * 60 * 5, // 5 minutes,
		placeholderData: keepPreviousData,
	});
	console.log(isFetching);

	// // Reset pagination when the query changes ???????
	// useEffect(() => {
	// 	setPaginationModel((prev) => ({ ...prev, page: 0 }));
	// }, [queryParam]);

	// if (!indexCode) {
	// 	return (
	// 		<Box
	// 			sx={{
	// 				display: "flex",
	// 				justifyContent: "center",
	// 				alignItems: "center",
	// 				height: "80vh",
	// 			}}>
	// 			<CircularProgress />
	// 		</Box>
	// 	);
	// }
	const columns: GridColDef[] = [
		{
			field: "card",
			flex: 1,
			disableColumnMenu: true,
			renderHeader: () => null,
			renderCell: (params) => <SearchResult params={params} />,
		},
	];

	return (
		<Box sx={{ width: "100%" }}>
			<Stack spacing={2} direction={"column"}>
				{/* <Typography variant="h1" gutterBottom>
					{t("nav.requesting.title")}
				</Typography> */}
				{/* Can we use react-hook-form here */}

				<Stack
					direction={{ xs: "column", sm: "row" }}
					justifyContent="space-between"
					alignItems={{ xs: "flex-start", sm: "center" }}
					spacing={2}>
					<Typography variant="h1" gutterBottom sx={{ mb: { xs: 0, sm: 0 } }}>
						{t("nav.requesting.title")}
					</Typography>

					<Box>
						<Button
							id="actions-menu-button"
							aria-controls={isMenuOpen ? "actions-menu" : undefined}
							aria-haspopup="true"
							aria-expanded={isMenuOpen ? "true" : undefined}
							onClick={handleMenuClick}
							variant="contained"
							color="primary"
							startIcon={<ChecklistRounded />}>
							{t("ui.actions.menu", "Actions")}
						</Button>
						<Menu
							id="actions-menu"
							anchorEl={menuAnchorEl}
							open={isMenuOpen}
							onClose={handleMenuClose}
							slotProps={{
								list: {
									"aria-labelledby": "actions-menu-button",
								},
							}}>
							<MenuItem onClick={handleQuickWalkUpClick}>
								{t("requesting.quick_walk_up.button", "Quick Walk-Up Request")}
							</MenuItem>
						</Menu>
					</Box>
				</Stack>
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
						{isAdvancedSearchAvailable ? (
							<Button variant="outlined" onClick={toggleAdvancedMode}>
								{isAdvancedMode
									? t("ui.actions.hide_advanced_search")
									: t("ui.actions.show_advanced_search")}
							</Button>
						) : null}
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
				onPaginationModelChange={handlePaginationModelChange} // Need a pagination handler. Solve first. Then get it to persist.
				rowCount={searchResults?.totalRecords || 0}
				paginationMode="server"
				pivotingEnabled={false}
				loading={isFetching || isLoading}
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
						paddingBottom: "32px", // Add space while respecting virtualisation! Very important lesson NOT to use margin
					},
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
			<Dialog
				open={showModal}
				onClose={() => setShowModal(false)}
				fullWidth
				maxWidth="sm">
				<DialogTitle variant="modalTitle">
					{t("requesting.quick_walk_up.title", "Quick Walk-Up Request")}
				</DialogTitle>
				<IconButton
					onClick={() => setShowModal(false)}
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: (theme) => theme.palette.grey[500],
					}}>
					<Close />
				</IconButton>

				<QuickWalkUpRequest onClose={() => setShowModal(false)} />
			</Dialog>
		</Box>
	);
}
