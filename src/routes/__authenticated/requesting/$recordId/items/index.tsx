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
					getDetailPanelContent={({ row }: GridRowParams) => (
						<MasterDetail type="items" row={row} />
					)}
					identifier="ClusterRecordItems"
					listViewEnabled={false}
					loading={isLoading}
					noResultsText={t("requesting.items_not_found")}
					pagination
					paginationMode="client"
					paginationModel={{ page: 0, pageSize: 25 }} // Still need to make the client-side pagination persistent
					pivotingEnabled={false}
					rows={items}
					scrollbarVisible={false}
					searchText={t("requesting.items_search")}
					toolbarVisible={true}
					type={"Items"}
					rowCount={items.length}
					rowModesModel={{}}
					filterMode="client"
					sortingMode="client"
					sortModel={[{ field: "availabilityDate", sort: "desc" }]}
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
								getDetailPanelContent={({ row }: any) => (
									<MasterDetail type="items" row={row} />
								)}
								identifier="ClusterRecordItemsNotShown"
								loading={isLoading}
								listViewEnabled={false}
								noResultsText={t("requesting.items_not_found")}
								pagination
								paginationMode="client"
								paginationModel={{ page: 0, pageSize: 25 }}
								pivotingEnabled={false}
								scrollbarVisible={false}
								searchText={t("requesting.items_search")}
								toolbarVisible={false}
								rows={itemsNotShown ?? []}
								type={"Items"}
								rowCount={itemsNotShown ? itemsNotShown.length : 0}
								rowModesModel={{}}
								filterMode="client"
								sortingMode="client"
								sortModel={[{ field: "availabilityDate", sort: "desc" }]}
							/>
						</AccordionDetails>
					</Accordion>
				</Grid>
			) : null}
		</Grid>
	);
}
