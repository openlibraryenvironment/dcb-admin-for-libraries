import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Stack,
	Typography,
} from "@mui/material";
import {
	CheckCircleOutline,
	ErrorOutline,
	ExpandMore,
	WarningAmber,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { cleanupPatronRequestVisibility } from "@helpers/dataGrid/columnVisibility/cleanupPatronRequestVisibility";
import { useState } from "react";
import DataGrid from "../DataGrid";
import { useGridStore } from "@/hooks/useDataGridStore";
import {
	GridPaginationModel,
	GridRowModesModel,
} from "@mui/x-data-grid-premium";

interface CleanupProgressDialogProps {
	open: boolean;
	isCleaning: boolean;
	progress: number;
	total: number;
	processed: number;
	successRows: any[];
	errorRows: any[];
	skippedRows: any[];
	onClose: () => void;
}

// Translation keys and more refinement needed
export const CleanupProgressDialog = ({
	open,
	isCleaning,
	progress,
	total,
	processed,
	successRows,
	errorRows,
	skippedRows,
	onClose,
}: CleanupProgressDialogProps) => {
	const { t } = useTranslation();

	const [isSuccessRowsExpanded, setIsSuccessRowsExpanded] = useState(false);
	const [isErrorRowsExpanded, setIsErrorRowsExpanded] = useState(false);
	const [isSkippedRowsExpanded, setIsSkippedRowsExpanded] = useState(false);
	const {
		paginationModel: cleanupPaginationModel,
		setPaginationModel: setCleanupPaginationModel,
		filterModel: cleanupFilterModel,
		setFilterModel: setCleanupFilterModel,
		sortModel: cleanupSortModel,
		setSortModel: setCleanupSortModel,
	} = useGridStore();
	const currentPagination = cleanupPaginationModel["cleanupGridId"] ?? {
		page: 0,
		pageSize: 25,
	};
	const currentFilter = cleanupFilterModel["cleanupGridId"] ?? { items: [] };
	const currentSort = cleanupSortModel["cleanupGridId"] ?? [
		{ field: "auditDate", sort: "desc" },
	];
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const successCleanupGridId = "cleanup-success-grid";
	const skippedCleanupGridId = "cleanup-skipped-grid";
	const failedCleanupGridId = "cleanup-error-grid";

	return (
		<Dialog open={open} fullWidth maxWidth="sm">
			<DialogTitle variant="modalTitle">
				{isCleaning
					? t("patron_request.cleanup_in_progress")
					: t("patron_request.cleanup_complete")}
			</DialogTitle>
			<DialogContent>
				<Stack direction="column" spacing={1}>
					<Stack direction="column" spacing={1}>
						<Stack direction="row" spacing={1} alignItems="center">
							<LinearProgress
								variant="determinate"
								value={progress}
								color={isCleaning ? "primary" : "success"}
								aria-labelledby="progressOfCleanup"
								sx={{ flex: 1 }}
								// sx={{ height: 10, borderRadius: 5 }}
							/>
							{isCleaning ? (
								<Typography
									variant="body2"
									color="secondary"
									align="right"
									sx={{ mt: 1 }}>
									{processed} / {total}
								</Typography>
							) : null}
						</Stack>
						{successRows?.length > 0 ? (
							<Stack direction="column" spacing={1}>
								<Accordion
									expanded={isSuccessRowsExpanded}
									onChange={() =>
										setIsSuccessRowsExpanded(!isSuccessRowsExpanded)
									}
									sx={{ mt: 2 }}>
									<AccordionSummary
										expandIcon={<ExpandMore />}
										aria-controls="success-rows-show-content"
										id="success-rows-show-content">
										<Stack direction={"row"} spacing={1}>
											<CheckCircleOutline color="success" />
											<Typography variant="h3" sx={{ fontWeight: "bold" }}>
												{t("ui.data_grid.cleanup.success_count", {
													count: successRows?.length,
												})}
											</Typography>
										</Stack>
									</AccordionSummary>
									<AccordionDetails>
										<DataGrid
											rows={successRows}
											columns={standardPatronRequestColumns}
											columnVisibilityModel={cleanupPatronRequestVisibility}
											type="successCleanupRequests"
											disableAggregation
											disableRowGrouping
											toolbarVisible={false}
											checkboxSelection={false}
											disableHoverInteractions={false}
											disablePivoting
											filterMode="client"
											onFilterModelChange={(newModel) =>
												setCleanupFilterModel(successCleanupGridId, newModel)
											}
											identifier={successCleanupGridId}
											pagination
											paginationMode="client"
											onPaginationModelChange={(
												newModel: GridPaginationModel,
											) =>
												setCleanupPaginationModel(
													successCleanupGridId,
													newModel,
												)
											}
											listViewEnabled={false}
											pivotingEnabled
											loading={isCleaning}
											scrollbarVisible={false}
											paginationModel={currentPagination}
											filterModel={currentFilter}
											rowModesModel={rowModesModel}
											onRowModesModelChange={setRowModesModel}
											onSortModelChange={(newModel) =>
												setCleanupSortModel(successCleanupGridId, newModel)
											}
											sortModel={currentSort}
											sortingMode="client"
											noResultsText={t("patron_request.no_requests")}
											searchText=""
										/>
									</AccordionDetails>
								</Accordion>
							</Stack>
						) : null}
					</Stack>
					{errorRows?.length > 0 ? (
						<Stack direction="column" spacing={1}>
							<Accordion
								expanded={isErrorRowsExpanded}
								onChange={() => setIsErrorRowsExpanded(!isErrorRowsExpanded)}
								sx={{ mt: 2 }}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="error-rows-show-content"
									id="error-rows-show-content">
									<Stack direction={"row"} spacing={1}>
										<ErrorOutline color="error" />
										<Typography variant="h3" sx={{ fontWeight: "bold" }}>
											{t("ui.data_grid.cleanup.error_count", {
												count: errorRows?.length,
											})}
										</Typography>
									</Stack>
								</AccordionSummary>
								<AccordionDetails>
									<DataGrid
										rows={errorRows}
										columns={standardPatronRequestColumns}
										columnVisibilityModel={cleanupPatronRequestVisibility}
										type="errorCleanupRequests"
										disableAggregation
										disableRowGrouping
										toolbarVisible={false}
										checkboxSelection={false}
										disableHoverInteractions={false}
										disablePivoting
										filterMode="client"
										onFilterModelChange={(newModel) =>
											setCleanupFilterModel(failedCleanupGridId, newModel)
										}
										identifier={failedCleanupGridId}
										pagination
										paginationMode="client"
										onPaginationModelChange={(newModel: GridPaginationModel) =>
											setCleanupPaginationModel(failedCleanupGridId, newModel)
										}
										listViewEnabled={false}
										pivotingEnabled
										loading={isCleaning}
										scrollbarVisible={false}
										paginationModel={currentPagination}
										filterModel={currentFilter}
										rowModesModel={rowModesModel}
										onRowModesModelChange={setRowModesModel}
										onSortModelChange={(newModel) =>
											setCleanupSortModel(failedCleanupGridId, newModel)
										}
										sortModel={currentSort}
										sortingMode="client"
										noResultsText={t("patron_request.no_requests")}
										searchText=""
									/>
								</AccordionDetails>
							</Accordion>
						</Stack>
					) : null}
					{skippedRows?.length > 0 ? (
						<Stack direction={"column"} spacing={1}>
							<Accordion
								expanded={isSkippedRowsExpanded}
								onChange={() =>
									setIsSkippedRowsExpanded(!isSkippedRowsExpanded)
								}
								sx={{ mt: 2 }}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="skipped-rows-show-content"
									id="skipped-rows-show-content">
									<Stack direction={"row"} spacing={1}>
										<WarningAmber color="warning" />
										<Typography variant="h3" sx={{ fontWeight: "bold" }}>
											{t("ui.data_grid.cleanup.skipped_count", {
												count: skippedRows?.length,
											})}
										</Typography>
									</Stack>
								</AccordionSummary>
								<AccordionDetails>
									<DataGrid
										rows={skippedRows}
										columns={standardPatronRequestColumns}
										columnVisibilityModel={cleanupPatronRequestVisibility}
										type="skippedCleanupRequests"
										disableAggregation
										disableRowGrouping
										toolbarVisible={false}
										checkboxSelection={false}
										disableHoverInteractions={false}
										disablePivoting
										filterMode="client"
										onFilterModelChange={(newModel) =>
											setCleanupFilterModel(skippedCleanupGridId, newModel)
										}
										identifier={skippedCleanupGridId}
										pagination
										paginationMode="client"
										onPaginationModelChange={(newModel: GridPaginationModel) =>
											setCleanupPaginationModel(skippedCleanupGridId, newModel)
										}
										listViewEnabled={false}
										pivotingEnabled
										loading={isCleaning}
										scrollbarVisible={false}
										paginationModel={currentPagination}
										filterModel={currentFilter}
										rowModesModel={rowModesModel}
										onRowModesModelChange={setRowModesModel}
										onSortModelChange={(newModel) =>
											setCleanupSortModel(skippedCleanupGridId, newModel)
										}
										sortModel={currentSort}
										sortingMode="client"
										noResultsText={t("patron_request.no_requests")}
										searchText=""
									/>
								</AccordionDetails>
							</Accordion>
						</Stack>
					) : null}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isCleaning} variant="contained">
					{t("ui.actions.close")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};
