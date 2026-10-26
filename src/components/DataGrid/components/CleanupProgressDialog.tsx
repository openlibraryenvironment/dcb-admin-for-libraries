import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
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
	CheckCircleOutlined,
	ErrorOutlined,
	ExpandMore,
	WarningAmber,
} from "@mui/icons-material";
import { visuallyHidden } from "@mui/utils";
import { useTranslation } from "react-i18next";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { cleanupPatronRequestVisibility } from "@helpers/dataGrid/columnVisibility/cleanupPatronRequestVisibility";
import { useState } from "react";
import DataGrid from "../DataGrid";
import { useGridStore } from "@/hooks/useDataGridStore";
import {
	GridPaginationModel,
	GridFilterModel,
	GridRowModesModel,
	GridSortModel,
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
	/** Refused by dcb-service because the item is not back at the supplying library. */
	refusedRows?: any[];
	/** Offered where dcb-service accepts an override (9.0.0 and later); asks again before it runs. */
	onOverride?: () => void;
	onClose: () => void;
}

// Translation keys and more refinement needed
const CLEANUP_PAGINATION = { page: 0, pageSize: 25 };
const NO_FILTER: GridFilterModel = { items: [] };
const CLEANUP_SORT: GridSortModel = [{ field: "dateCreated", sort: "desc" }];

export const CleanupProgressDialog = ({
	open,
	isCleaning,
	progress,
	total,
	processed,
	successRows,
	errorRows,
	skippedRows,
	refusedRows = [],
	onOverride,
	onClose,
}: CleanupProgressDialogProps) => {
	const { t } = useTranslation();

	const [isSuccessRowsExpanded, setIsSuccessRowsExpanded] = useState(false);
	const [isErrorRowsExpanded, setIsErrorRowsExpanded] = useState(false);
	const [isSkippedRowsExpanded, setIsSkippedRowsExpanded] = useState(false);
	// Open: "Clean up anyway" asks the reader to confirm where each of these items is
	const [isRefusedRowsExpanded, setIsRefusedRowsExpanded] = useState(true);
	const paginationModels = useGridStore((state) => state.paginationModel);
	const filterModels = useGridStore((state) => state.filterModel);
	const sortModels = useGridStore((state) => state.sortModel);
	const setCleanupPaginationModel = useGridStore((state) => state.setPaginationModel);
	const setCleanupFilterModel = useGridStore((state) => state.setFilterModel);
	const setCleanupSortModel = useGridStore((state) => state.setSortModel);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const successCleanupGridId = "cleanup-success-grid";
	const skippedCleanupGridId = "cleanup-skipped-grid";
	const failedCleanupGridId = "cleanup-error-grid";
	const refusedCleanupGridId = "cleanup-refused-grid";
	// Each grid's own state, under the id it is written to
	const modelsFor = (gridId: string) => ({
		paginationModel: paginationModels[gridId] ?? CLEANUP_PAGINATION,
		filterModel: filterModels[gridId] ?? NO_FILTER,
		sortModel: sortModels[gridId] ?? CLEANUP_SORT,
	});

	return (
        <Dialog
            open={open}
            fullWidth
            maxWidth="sm"
            // The title already carried this id and nothing pointed at it, so the
            // dialog had no accessible name at all (axe: aria-dialog-name).
            aria-labelledby="progressOfCleanup">
            <DialogTitle id="progressOfCleanup" variant="modalTitle">
				{isCleaning
					? t("patron_request.cleanup_in_progress")
					: t("patron_request.cleanup_complete")}
			</DialogTitle>
            <DialogContent>
				{/* In the dialog: MUI hides #root, and the app's live region with it, while it is open */}
				<Box role="status" aria-live="polite" sx={visuallyHidden}>
					{isCleaning ? "" : t("patron_request.cleanup_complete")}
				</Box>
				<Stack direction="column" spacing={1}>
					<Stack direction="column" spacing={1}>
						<Stack direction="row" spacing={1} sx={{
                            alignItems: "center"
                        }}>
							<LinearProgress
								variant="determinate"
								value={progress}
								color={isCleaning ? "primary" : "success"}
								// An aria-labelledby pointing at an id nothing renders leaves the bar
								// with no accessible name (axe: aria-progressbar-name).
								aria-label={t("patron_request.cleanup_in_progress")}
								sx={{ flex: 1 }}
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
										aria-controls="success-rows-content"
										id="success-rows-header">
										<Stack direction={"row"} spacing={1}>
											<CheckCircleOutlined color="success" />
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
											label={t("patron_request.cleanup_succeeded")}
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
											paginationModel={modelsFor(successCleanupGridId).paginationModel}
											filterModel={modelsFor(successCleanupGridId).filterModel}
											rowModesModel={rowModesModel}
											onRowModesModelChange={setRowModesModel}
											onSortModelChange={(newModel) =>
												setCleanupSortModel(successCleanupGridId, newModel)
											}
											sortModel={modelsFor(successCleanupGridId).sortModel}
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
									aria-controls="error-rows-content"
									id="error-rows-header">
									<Stack direction={"row"} spacing={1}>
										<ErrorOutlined color="error" />
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
										label={t("patron_request.cleanup_failed")}
										identifier={failedCleanupGridId}
										pagination
										paginationMode="client"
										onPaginationModelChange={(newModel: GridPaginationModel) =>
											setCleanupPaginationModel(failedCleanupGridId, newModel)
										}
										listViewEnabled={false}
										pivotingEnabled
										loading={isCleaning}
										paginationModel={modelsFor(failedCleanupGridId).paginationModel}
										filterModel={modelsFor(failedCleanupGridId).filterModel}
										rowModesModel={rowModesModel}
										onRowModesModelChange={setRowModesModel}
										onSortModelChange={(newModel) =>
											setCleanupSortModel(failedCleanupGridId, newModel)
										}
										sortModel={modelsFor(failedCleanupGridId).sortModel}
										sortingMode="client"
										noResultsText={t("patron_request.no_requests")}
										searchText=""
									/>
								</AccordionDetails>
							</Accordion>
						</Stack>
					) : null}
					{refusedRows?.length > 0 ? (
						<Stack direction="column" spacing={1}>
							<Accordion
								expanded={isRefusedRowsExpanded}
								onChange={() => setIsRefusedRowsExpanded(!isRefusedRowsExpanded)}
								sx={{ mt: 2 }}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="refused-rows-content"
									id="refused-rows-header">
									<Stack direction={"row"} spacing={1}>
										<WarningAmber color="warning" />
										<Typography variant="h3" sx={{ fontWeight: "bold" }}>
											{t("ui.data_grid.cleanup.refused_count", {
												count: refusedRows.length,
											})}
										</Typography>
									</Stack>
								</AccordionSummary>
								<AccordionDetails>
									<DataGrid
										rows={refusedRows}
										columns={standardPatronRequestColumns}
										columnVisibilityModel={cleanupPatronRequestVisibility}
										type="refusedCleanupRequests"
										disableAggregation
										disableRowGrouping
										toolbarVisible={false}
										checkboxSelection={false}
										disableHoverInteractions={false}
										disablePivoting
										filterMode="client"
										onFilterModelChange={(newModel) =>
											setCleanupFilterModel(refusedCleanupGridId, newModel)
										}
										label={t("patron_request.cleanup_refused_rows")}
										identifier={refusedCleanupGridId}
										pagination
										paginationMode="client"
										onPaginationModelChange={(newModel: GridPaginationModel) =>
											setCleanupPaginationModel(refusedCleanupGridId, newModel)
										}
										listViewEnabled={false}
										pivotingEnabled
										loading={isCleaning}
										paginationModel={modelsFor(refusedCleanupGridId).paginationModel}
										filterModel={modelsFor(refusedCleanupGridId).filterModel}
										rowModesModel={rowModesModel}
										onRowModesModelChange={setRowModesModel}
										onSortModelChange={(newModel) =>
											setCleanupSortModel(refusedCleanupGridId, newModel)
										}
										sortModel={modelsFor(refusedCleanupGridId).sortModel}
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
									aria-controls="skipped-rows-content"
									id="skipped-rows-header">
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
										label={t("patron_request.cleanup_skipped")}
										identifier={skippedCleanupGridId}
										pagination
										paginationMode="client"
										onPaginationModelChange={(newModel: GridPaginationModel) =>
											setCleanupPaginationModel(skippedCleanupGridId, newModel)
										}
										listViewEnabled={false}
										pivotingEnabled
										loading={isCleaning}
										paginationModel={modelsFor(skippedCleanupGridId).paginationModel}
										filterModel={modelsFor(skippedCleanupGridId).filterModel}
										rowModesModel={rowModesModel}
										onRowModesModelChange={setRowModesModel}
										onSortModelChange={(newModel) =>
											setCleanupSortModel(skippedCleanupGridId, newModel)
										}
										sortModel={modelsFor(skippedCleanupGridId).sortModel}
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
				{onOverride && refusedRows.length > 0 && !isCleaning ? (
					<Button onClick={onOverride} color="error" variant="outlined">
						{t("ui.data_grid.cleanup.override", { count: refusedRows.length })}
					</Button>
				) : null}
				<Button onClick={onClose} disabled={isCleaning} variant="contained">
					{t("ui.actions.close")}
				</Button>
			</DialogActions>
        </Dialog>
    );
};
