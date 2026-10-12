import { useRouter, useSearch } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import {
	keepPreviousData,
	useQuery,
	type QueryFunctionContext,
} from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import LinearProgress from "@mui/material/LinearProgress";
import TablePagination from "@mui/material/TablePagination";
import { GridPaginationModel } from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";
import { useAnnounce } from "@/hooks/useAnnouncer";
import {
	Button,
	Dialog,
	DialogTitle,
	IconButton,
	Menu,
	MenuItem,
} from "@mui/material";

import { AdvancedSearchFilter } from "./AdvancedSearchFilter";
import {
	SearchField,
	SearchFilter,
	SearchInstance,
} from "@models/SearchTypes";
import { buildQuery } from "@helpers/search/queryBuilder";
import { SearchResult } from "@components/SearchResultComponent/SearchResultComponent";
import Error from "@components/Error/Error";
import { useSearchGridStore } from "@/hooks/useSearchGridStore";
import { parseQuery } from "@helpers/search/queryParser";
import type { RequestingSearch } from "@helpers/requestingSearch";
import { clampPageSize, PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";
import { validate } from "uuid";
import { ChecklistRounded, Close } from "@mui/icons-material";
import QuickWalkUpRequest from "@forms/QuickWalkUp/QuickWalkUp";

const createDefaultFilter = (): SearchFilter => ({
	id: Date.now().toString(),
	field: SearchField.Title,
	value: "",
});

type SearchKey = ReturnType<typeof queryKeys.search.results>;

const fetchSearchResults = async ({
	queryKey,
	signal,
}: QueryFunctionContext<SearchKey>) => {
	const [, , searchBase, query, pageno, pagesize] = queryKey;
	const isUUID = query.length === 36 ? validate(query) : false;

	if (!query) {
		return { instances: [], totalRecords: 0 };
	}

	let url: string;
	let params: Record<string, any>;

	if (isUUID) {
		url = `${searchBase}/public/opac-inventory/instances/${query}`;
		params = {};
	} else {
		url = `${searchBase}/search/instances`;
		params = {
			query: query,
			offset: pageno * pagesize,
			limit: pagesize,
		};
	}
	// The signal cancels a search the user has already replaced with another.
	const response = await axios.get(url, {
		headers: await authHeaders(),
		params: params,
		signal,
	});

	if (isUUID && response.data) {
		return {
			instances: [response.data],
			totalRecords: 1,
		};
	} else {
		return {
			instances: response.data.instances || [],
			totalRecords: response.data.totalRecords || 0,
		};
	}
};

export function SharedIndexV2() {
	const auth = useAuth();
	const router = useRouter();
	const { cfg } = router.options.context as { cfg: any };
	const { t } = useTranslation();
	const announce = useAnnounce();
	const roles = auth?.user?.profile?.roles ? auth?.user?.profile?.roles : [];

	// Quick walk-up stays with consortium admins until its role gate is decided.
	const isAdmin = roles.includes("CONSORTIUM_ADMIN");
	// Validated by the route's requestingSearchSchema.
	const search: RequestingSearch = useSearch({ strict: false });
	const queryParam = search.filters;
	const pageno = search.pageno ?? 0;
	const pagesize = clampPageSize(search.pagesize);

	const appliedFilters = useSearchGridStore((state) => state.appliedFilters);
	const setAppliedFilters = useSearchGridStore(
		(state) => state.setAppliedFilters,
	);
	const paginationModel: GridPaginationModel = {
		page: pageno,
		pageSize: pagesize,
	};

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		router.navigate({
			to: "/requesting",
			search: {
				filters: queryParam,
				pageno: newModel.page,
				pagesize: newModel.pageSize,
			},
			replace: true,
		});
	};

	const [stagedFilters, setStagedFilters] = useState<SearchFilter[]>([
		createDefaultFilter(),
	]);

	const [isDirty, setIsDirty] = useState(false);
	const [isAdvancedMode, setIsAdvancedMode] = useState(false);

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

	useEffect(() => {
		const initialFilters = parseQuery(queryParam || "");

		const filtersToSet =
			initialFilters.length > 0 ? initialFilters : [createDefaultFilter()];

		setAppliedFilters(filtersToSet);
		setStagedFilters(filtersToSet);
		if (filtersToSet.length > 1) {
			setIsAdvancedMode(true);
		}
	}, [queryParam, setAppliedFilters]);
	useEffect(() => {
		const staged = JSON.stringify(stagedFilters.filter((f) => f.value));
		const applied = JSON.stringify(appliedFilters.filter((f) => f.value));
		setIsDirty(staged !== applied);
	}, [stagedFilters, appliedFilters]);

	const handleApplyFilters = useCallback(
		(newFilters: SearchFilter[]) => {
			const activeFilters = newFilters.filter((f) => f.value);
			setAppliedFilters(activeFilters);

			router.navigate({
				to: "/requesting",
				search: {
					filters: buildQuery(activeFilters),
					pagesize: paginationModel.pageSize,
					// A new search starts at its first page: page 4 of the last one may
					// not exist in this one.
					pageno: 0,
				},
				replace: true,
			});
		},
		[router, setAppliedFilters, paginationModel.pageSize],
	);

	const isClusterIdSearch =
		stagedFilters[0]?.field === SearchField.ClusterRecordID;
	const stagedValue = stagedFilters[0]?.value?.trim() ?? "";
	const isInvalidClusterId =
		isClusterIdSearch && stagedValue !== "" && !validate(stagedValue);

	const handleSearchSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (isInvalidClusterId) return;
		handleApplyFilters(stagedFilters);
	};
	const toggleAdvancedMode = () => {
		setIsAdvancedMode((prev) => {
			const nextMode = !prev;
			if (!nextMode) {
				setStagedFilters((currentFilters) => [
					currentFilters[0] || createDefaultFilter(),
				]);
			}
			return nextMode;
		});
	};

	const {
		data: searchResults,
		isLoading,
		isFetching,
		isError,
	} = useQuery({
		queryKey: queryKeys.search.results(
			cfg.VITE_DCB_SEARCH_BASE,
			queryParam ?? "",
			pageno,
			pagesize,
		),
		queryFn: fetchSearchResults,
		enabled: auth.isAuthenticated && !!queryParam,
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

	const totalRecords = searchResults?.totalRecords;
	const instances: SearchInstance[] = searchResults?.instances ?? [];

	// The result count changes on screen and nothing else says so - the count
	// renders into a span, and the grid below it redraws silently. WCAG 4.1.3.
	// Announcing on the settled value rather than on each keystroke: isFetching
	// would narrate every intermediate state of a debounced search.
	useEffect(() => {
		if (typeof totalRecords !== "number") return;
		announce(t("requesting.titles_found", { number: totalRecords }));
	}, [totalRecords, announce, t]);

	return (
		<Box sx={{ width: "100%" }}>
			<Stack spacing={2} direction={"column"}>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={2}
					sx={{
						justifyContent: "space-between",
						alignItems: { xs: "flex-start", sm: "center" },
					}}>
					<Typography variant="h1" gutterBottom sx={{ mb: { xs: 0, sm: 0 } }}>
						{t("nav.requesting.title")}
					</Typography>

					{isAdmin ? (
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
								{t("ui.actions.title")}
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
									{t("requesting.quick_walk_up.button")}
								</MenuItem>
							</Menu>
						</Box>
					) : null}
				</Stack>
				<form onSubmit={handleSearchSubmit}>
					<AdvancedSearchFilter
						filters={stagedFilters}
						onFiltersChange={setStagedFilters}
						isAdvancedMode={isAdvancedMode}
						invalidFilterId={
							isInvalidClusterId ? stagedFilters[0].id : undefined
						}
					/>
					<Stack
						direction="row"
						spacing={2}
						useFlexGap
						sx={{
							alignItems: "center",
							flexWrap: "wrap",
							mt: 2,
						}}>
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
								disabled={!stagedValue || isInvalidClusterId}>
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

				{typeof totalRecords === "number" ? (
					<Typography variant="hitCount">
						{t("requesting.titles_found", { number: totalRecords })}
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
			{/* A LIST, not a one-column grid. These are search results: rendering
			    them through DataGridPremium with a null column header announced
			    "grid, row, column 1 of 1" before each card and bought nothing -
			    sorting and filtering are both server-side and the toolbar was
			    hidden. */}
			<List
				aria-label={t("requesting.results_label")}
				sx={{ p: 0, display: "flex", flexDirection: "column", gap: 4 }}>
				{instances.map((record) => (
					<ListItem key={record.id} disablePadding sx={{ display: "block" }}>
						<SearchResult record={record} />
					</ListItem>
				))}
			</List>
			{isFetching || isLoading ? (
				<LinearProgress
					aria-label={t("requesting.shared_index.loading_results")}
					sx={{ mt: 2 }}
				/>
			) : null}
			{!isFetching && !isLoading && instances.length === 0 ? (
				<Typography sx={{ mt: 2 }}>
					{queryParam
						? t("requesting.no_results")
						: t("requesting.search_prompt")}
				</Typography>
			) : null}
			{typeof totalRecords === "number" && totalRecords > 0 ? (
				<TablePagination
					component="div"
					count={totalRecords}
					page={paginationModel.page}
					rowsPerPage={paginationModel.pageSize}
					rowsPerPageOptions={PAGE_SIZE_OPTIONS}
					onPageChange={(_event, page) =>
						handlePaginationModelChange({ ...paginationModel, page })
					}
					onRowsPerPageChange={(event) =>
						handlePaginationModelChange({
							page: 0,
							pageSize: Number(event.target.value),
						})
					}
					labelRowsPerPage={t("requesting.results_per_page")}
				/>
			) : null}
			<Dialog
				open={showModal}
				onClose={() => setShowModal(false)}
				aria-labelledby="quick-walk-up-title"
				fullWidth
				maxWidth="sm">
				<DialogTitle id="quick-walk-up-title" variant="modalTitle">
					{t("requesting.quick_walk_up.title")}
				</DialogTitle>
				<IconButton
					aria-label={t("ui.actions.close")}
					onClick={() => setShowModal(false)}
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: (theme) => (theme.vars || theme).palette.grey[500],
					}}>
					<Close />
				</IconButton>

				<QuickWalkUpRequest onClose={() => setShowModal(false)} />
			</Dialog>
		</Box>
	);
}
