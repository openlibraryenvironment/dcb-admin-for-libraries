import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Grid,
	Typography,
	Alert,
	AlertTitle,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	GridFilterModel,
	GridPaginationModel,
	GridRowParams,
	GridSortModel,
} from "@mui/x-data-grid-premium";

import DataGrid from "@components/DataGrid/DataGrid";
import MasterDetail from "@components/MasterDetail/MasterDetail";
import Loading from "@components/Loading/Loading";
import { getAggregatedErrorMessage } from "@helpers/liveAvailabilityErrorMapper";
import { itemColumns } from "@helpers/dataGrid/columns/itemColumns";
import { DEFAULT_PAGE_SIZE } from "@constants/dataGrid/pagination";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { useGridStore } from "@/hooks/useDataGridStore";

const route = getRouteApi("/__authenticated/requesting/$recordId/items/");

const ITEMS_GRID = "ClusterRecordItems";
const ITEMS_NOT_SHOWN_GRID = "ClusterRecordItemsNotShown";

// Module constants: a fallback built inside a Zustand selector is a new object on
// every read, which the store treats as a change and re-renders forever.
const DEFAULT_PAGINATION: GridPaginationModel = {
	page: 0,
	pageSize: DEFAULT_PAGE_SIZE,
};
const DEFAULT_FILTER: GridFilterModel = { items: [] };
const DEFAULT_SORT: GridSortModel = [{ field: "availabilityDate", sort: "desc" }];

/** One grid's persisted state, read by its own id. */
const useItemsGridState = (gridId: string) => {
	const paginationModel =
		useGridStore((state) => state.paginationModel[gridId]) ??
		DEFAULT_PAGINATION;
	const filterModel =
		useGridStore((state) => state.filterModel[gridId]) ?? DEFAULT_FILTER;
	const sortModel =
		useGridStore((state) => state.sortModel[gridId]) ?? DEFAULT_SORT;
	const setPaginationModel = useGridStore((state) => state.setPaginationModel);
	const setFilterModel = useGridStore((state) => state.setFilterModel);
	const setSortModel = useGridStore((state) => state.setSortModel);

	return {
		paginationModel,
		filterModel,
		sortModel,
		onPaginationModelChange: (model: GridPaginationModel) =>
			setPaginationModel(gridId, model),
		onFilterModelChange: (model: GridFilterModel) =>
			setFilterModel(gridId, model),
		onSortModelChange: (model: GridSortModel) => setSortModel(gridId, model),
	};
};

export default function ClusterItems() {
	const { recordId } = route.useParams();
	const { t } = useTranslation();
	const [isItemsAccordionExpanded, setIsItemsAccordionExpanded] =
		useState(false);

	const {
		items,
		itemsNotShown,
		isLoading,
		isError,
		totalItemsCount,
		responseErrors,
	} = useClusterDetail(recordId, { mode: "items" });

	const itemsGrid = useItemsGridState(ITEMS_GRID);
	const itemsNotShownGrid = useItemsGridState(ITEMS_NOT_SHOWN_GRID);

	if (isLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("requesting.items"),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	// A failed fan-out is not an empty one: "no items found" would tell staff the
	// record has no copies when the truth is that availability could not be asked.
	if (isError) {
		return (
			<Alert severity="error">
				<AlertTitle>{t("requesting.items_error_title")}</AlertTitle>
				{t("ui.feedback.error.reload_message")}
			</Alert>
		);
	}

	const hasZeroItems = totalItemsCount === 0;

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
				{responseErrors != null && responseErrors?.length > 0 ? (
					<Grid size={{ xs: 12 }}>
						<Alert severity="error" sx={{ mb: 2 }}>
							<AlertTitle>{t("ui.feedback.error.general")}</AlertTitle>
							{getAggregatedErrorMessage(responseErrors, t)}
						</Alert>
					</Grid>
				) : null}
				{hasZeroItems ? (
					<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
						<Alert severity="info">
							<AlertTitle>{t("ui.feedback.info.general")}</AlertTitle>
							{t("requesting.live_availability_no_items")}
						</Alert>
					</Grid>
				) : null}

				<Stack direction={"column"}>
					{!hasZeroItems ? (
						<Typography variant="h4" component="h2">
							{t("requesting.shared_index.items_for_cluster", {
								number: totalItemsCount,
							})}
						</Typography>
					) : null}
					{itemsNotShown?.length > 0 ? (
						<Typography variant="h4" component="h2">
							{t("requesting.shared_index.items_not_shown_long", {
								number: itemsNotShown?.length,
								id: recordId,
							})}
						</Typography>
					) : null}
				</Stack>
			</Grid>

			<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
				<DataGrid
					checkboxSelection={false}
					columns={itemColumns}
					disableAggregation={true}
					disableHoverInteractions={true}
					disablePivoting
					disableRowGrouping={true}
					filterMode="client"
					filterModel={itemsGrid.filterModel}
					onFilterModelChange={itemsGrid.onFilterModelChange}
					getDetailPanelContent={({ row }: GridRowParams) => (
						<MasterDetail type="items" row={row} />
					)}
					label={t("requesting.items_label")}
					identifier={ITEMS_GRID}
					listViewEnabled={false}
					loading={isLoading}
					noResultsText={t("requesting.items_not_found")}
					onPaginationModelChange={itemsGrid.onPaginationModelChange}
					pagination
					paginationMode="client"
					paginationModel={itemsGrid.paginationModel}
					pivotingEnabled={false}
					rows={items}
					searchText={t("requesting.items_search")}
					toolbarVisible={true}
					type={"Items"}
					rowModesModel={{}}
					sortingMode="client"
					sortModel={itemsGrid.sortModel}
					onSortModelChange={itemsGrid.onSortModelChange}
				/>
			</Grid>

			{itemsNotShown?.length > 0 ? (
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Accordion
						expanded={isItemsAccordionExpanded}
						onChange={() =>
							setIsItemsAccordionExpanded(!isItemsAccordionExpanded)
						}>
						<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls="items-not-shown-content"
							id="not-shown-header">
							<Typography variant="h6" component="span">
								{t("requesting.shared_index.items_not_shown", {
									number: itemsNotShown?.length,
								})}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Typography>
								{t("requesting.shared_index.items_not_shown_resolution")}
							</Typography>
							<DataGrid
								checkboxSelection={false}
								columns={itemColumns}
								disableAggregation={true}
								disableHoverInteractions={true}
								disablePivoting
								disableRowGrouping={true}
								filterMode="client"
								filterModel={itemsNotShownGrid.filterModel}
								onFilterModelChange={itemsNotShownGrid.onFilterModelChange}
								getDetailPanelContent={({ row }: GridRowParams) => (
									<MasterDetail type="items" row={row} />
								)}
								label={t("requesting.items_not_shown_label")}
								identifier={ITEMS_NOT_SHOWN_GRID}
								loading={isLoading}
								listViewEnabled={false}
								noResultsText={t("requesting.items_not_found")}
								onPaginationModelChange={
									itemsNotShownGrid.onPaginationModelChange
								}
								pagination
								paginationMode="client"
								paginationModel={itemsNotShownGrid.paginationModel}
								pivotingEnabled={false}
								searchText={t("requesting.items_search")}
								toolbarVisible={false}
								rows={itemsNotShown ?? []}
								type={"Items"}
								rowModesModel={{}}
								sortingMode="client"
								sortModel={itemsNotShownGrid.sortModel}
								onSortModelChange={itemsNotShownGrid.onSortModelChange}
							/>
						</AccordionDetails>
					</Accordion>
				</Grid>
			) : null}
		</Grid>
	);
}
