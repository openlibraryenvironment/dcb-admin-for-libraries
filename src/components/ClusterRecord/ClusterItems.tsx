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

const route = getRouteApi("/__authenticated/requesting/$recordId/items/");

const ITEMS_GRID = "ClusterRecordItems";
const ITEMS_NOT_SHOWN_GRID = "ClusterRecordItemsNotShown";

const DEFAULT_PAGINATION: GridPaginationModel = {
	page: 0,
	pageSize: DEFAULT_PAGE_SIZE,
};
const DEFAULT_FILTER: GridFilterModel = { items: [] };
const DEFAULT_SORT: GridSortModel = [{ field: "availabilityDate", sort: "desc" }];

/**
 * One record's items grid state. Local to the record, which the route remounts this for:
 * held in the app-wide grid store under a fixed id, a filter on one record's items applied
 * to the next record's, which then showed none.
 */
const useItemsGridState = () => {
	const [paginationModel, onPaginationModelChange] =
		useState<GridPaginationModel>(DEFAULT_PAGINATION);
	const [filterModel, onFilterModelChange] = useState<GridFilterModel>(DEFAULT_FILTER);
	const [sortModel, onSortModelChange] = useState<GridSortModel>(DEFAULT_SORT);

	return {
		paginationModel,
		filterModel,
		sortModel,
		onPaginationModelChange,
		onFilterModelChange,
		onSortModelChange,
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

	const itemsGrid = useItemsGridState();
	const itemsNotShownGrid = useItemsGridState();

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
								count: totalItemsCount,
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
