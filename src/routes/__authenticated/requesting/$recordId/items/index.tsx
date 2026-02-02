// routes/__authenticated/requesting/$recordId/items.tsx
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { GridRowParams } from "@mui/x-data-grid-premium";

import DataGrid from "@components/DataGrid/DataGrid";
import MasterDetail from "@components/MasterDetail/MasterDetail";
import Loading from "@components/Loading/Loading";
import { getAggregatedErrorMessage } from "@helpers/liveAvailabilityErrorMapper";
import { itemColumns } from "@helpers/dataGrid/columns/itemColumns";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { useGridStore } from "@/hooks/useDataGridStore";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/items/",
)({
	component: ItemsPageComponent,
});

function ItemsPageComponent() {
	const { recordId } = Route.useParams();
	const { t } = useTranslation();
	const [isItemsAccordionExpanded, setIsItemsAccordionExpanded] =
		useState(false);

	// The unified hook only needs to grab us the item info here
	const { items, itemsNotShown, isLoading, totalItemsCount, responseErrors } =
		useClusterDetail(recordId, { mode: "items" });
	const itemsGridId = "ClusterRecordItems";
	const itemsNotShownGridId = "ClusterRecordItemsNotShown";

	const {
		paginationModel: itemsPaginationModel,
		setPaginationModel: setItemsPaginationModel,
		filterModel: itemsFilterModel,
		setFilterModel: setItemsFilterModel,
		sortModel: itemsSortModel,
		setSortModel: setItemsSortModel,
	} = useGridStore();

	const {
		paginationModel: itemsNotShownPaginationModel,
		setPaginationModel: setItemsNotShownPaginationModel,
		filterModel: itemsNotShownFilterModel,
		setFilterModel: setItemsNotShownFilterModel,
		sortModel: itemsNotShownSortModel,
		setSortModel: setItemsNotShownSortModel,
	} = useGridStore();

	const itemsCurrentPagination = itemsPaginationModel[itemsGridId] ?? {
		page: 0,
		pageSize: 25,
	};
	const itemsCurrentFilterModel = itemsFilterModel[itemsGridId] ?? {
		items: [],
	};
	const itemsCurrentSortModel = itemsSortModel[itemsGridId] ?? [
		{ field: "availabilityDate", sort: "desc" },
	];

	const itemsNotShownCurrentPagination = itemsNotShownPaginationModel[
		itemsGridId
	] ?? {
		page: 0,
		pageSize: 25,
	};
	const itemsNotShownCurrentFilterModel = itemsNotShownFilterModel[
		itemsGridId
	] ?? {
		items: [],
	};
	const itemsNotShownCurrentSortModel = itemsNotShownSortModel[itemsGridId] ?? [
		{ field: "availabilityDate", sort: "desc" },
	];

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

	const hasZeroItems = !isLoading && totalItemsCount === 0;

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
							{/* Pass the errors array and the translation function */}
							{getAggregatedErrorMessage(responseErrors, t)}
						</Alert>
					</Grid>
				) : null}
				{hasZeroItems ? (
					<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
						<Alert severity="info">
							<AlertTitle>{t("ui.feedback.info.general")}</AlertTitle>
							{t("requesting.live_availability_no_items") ||
								"Live availability could not find any items for this record."}
						</Alert>
					</Grid>
				) : null}

				<Stack direction={"column"}>
					{!hasZeroItems ? (
						<Typography variant="h4">
							{t("requesting.shared_index.items_for_cluster", {
								number: totalItemsCount,
							})}
						</Typography>
					) : null}
					{itemsNotShown?.length > 0 ? (
						<Typography variant="h4">
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
					filterModel={itemsCurrentFilterModel}
					onFilterModelChange={(newModel) =>
						setItemsFilterModel(itemsGridId, newModel)
					}
					getDetailPanelContent={({ row }: GridRowParams) => (
						<MasterDetail type="items" row={row} />
					)}
					identifier="ClusterRecordItems"
					listViewEnabled={false}
					loading={isLoading}
					noResultsText={t("requesting.items_not_found")}
					onPaginationModelChange={setItemsPaginationModel}
					pagination
					paginationMode="client"
					paginationModel={itemsCurrentPagination}
					pivotingEnabled={false}
					rows={items}
					scrollbarVisible={false}
					searchText={t("requesting.items_search")}
					toolbarVisible={true}
					type={"Items"}
					rowModesModel={{}}
					sortingMode="client"
					sortModel={itemsCurrentSortModel}
					onSortModelChange={(newModel) =>
						setItemsSortModel(itemsGridId, newModel)
					}
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
							<Typography variant="h6">
								{t("requesting.shared_index.items_not_shown", {
									number: itemsNotShown?.length,
								})}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							{/** Diagnosis for mappings */}
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
								filterModel={itemsNotShownCurrentFilterModel}
								onFilterModelChange={(newModel) =>
									setItemsNotShownFilterModel(itemsNotShownGridId, newModel)
								}
								getDetailPanelContent={({ row }: any) => (
									<MasterDetail type="items" row={row} />
								)}
								identifier={itemsNotShownGridId}
								loading={isLoading}
								listViewEnabled={false}
								noResultsText={t("requesting.items_not_found")}
								onPaginationModelChange={setItemsNotShownPaginationModel}
								pagination
								paginationMode="client"
								paginationModel={itemsNotShownCurrentPagination}
								pivotingEnabled={false}
								scrollbarVisible={false}
								searchText={t("requesting.items_search")}
								toolbarVisible={false}
								rows={itemsNotShown ?? []}
								type={"Items"}
								rowModesModel={{}}
								sortingMode="client"
								sortModel={itemsNotShownCurrentSortModel}
								onSortModelChange={(newModel) =>
									setItemsNotShownSortModel(itemsNotShownGridId, newModel)
								}
							/>
						</AccordionDetails>
					</Accordion>
				</Grid>
			) : null}
		</Grid>
	);
}
