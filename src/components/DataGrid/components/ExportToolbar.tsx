import { generateFilterDescription } from "@helpers/dataGrid/utilities";
import {
	ChecklistRounded,
	CleaningServicesRounded,
	FileDownloadOutlined,
	PrintOutlined,
} from "@mui/icons-material";
import {
	Badge,
	Button,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Tooltip,
} from "@mui/material";
import {
	ColumnsPanelTrigger,
	FilterPanelTrigger,
	GridCsvExportMenuItem,
	GridFilterListIcon,
	gridFilterModelSelector,
	GridPrintExportMenuItem,
	gridRowSelectionCountSelector,
	GridToolbarExportContainer,
	GridViewColumnIcon,
	Toolbar,
	ToolbarButton,
	useGridApiContext,
	useGridSelector,
} from "@mui/x-data-grid-premium";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ExportToolbarProps {
	handleExport?: (fileType: string, exportMode: string) => Promise<void>;
	allDataLoading?: boolean;
	onCleanup?: () => void;
}

export default function ExportToolbar({
	handleExport,
	allDataLoading,
	onCleanup,
}: ExportToolbarProps) {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	const handleCleanupClick = () => {
		onCleanup?.();
		handleMenuClose();
	};
	const { t } = useTranslation();
	const apiRef = useGridApiContext();
	const filterModel = useGridSelector(apiRef, gridFilterModelSelector);
	// The grid's own count, not the size of the selection model: after "select
	// all" the model is an EXCLUDE list, whose ids are the rows NOT selected.
	const selectionCount = useGridSelector(apiRef, gridRowSelectionCountSelector);
	const filterTooltipText = generateFilterDescription(filterModel);
	return (
		<Toolbar>
			<Tooltip title={t("ui.data_grid.columns")}>
				<ColumnsPanelTrigger render={<ToolbarButton />}>
					<GridViewColumnIcon fontSize="small" />
				</ColumnsPanelTrigger>
			</Tooltip>
			<Tooltip title={filterTooltipText}>
				<FilterPanelTrigger
					render={(props, state) => (
						<ToolbarButton
							{...props}
							color="default"
							// The count is PAINTED on this button, so it has to be in the
							// button's name: a reader who cannot see the badge was told
							// "Show filters" whether two filters were applied or none.
							// WCAG 2.5.3 Label in Name.
							aria-label={
								state.filterCount
									? t("ui.data_grid.filters.trigger_applied", {
											count: state.filterCount,
										})
									: t("ui.data_grid.filters.trigger")
							}
						>
							{/* null rather than 0, so an unfiltered grid paints no digit at
							    all and there is no visible text to match. */}
							<Badge badgeContent={state.filterCount || null} color="primary">
								<GridFilterListIcon fontSize="small" />
							</Badge>
						</ToolbarButton>
					)}
				/>
			</Tooltip>
			{handleExport ? (
				<GridToolbarExportContainer>
					<MenuItem
						onClick={() => handleExport("csv", "all")}
						disabled={allDataLoading}>
						<ListItemIcon>
							<FileDownloadOutlined />
						</ListItemIcon>
						<ListItemText>{t("ui.data_grid.export.all")}</ListItemText>
					</MenuItem>
					<MenuItem
						onClick={() => handleExport("tsv", "all")}
						disabled={allDataLoading}>
						<ListItemIcon>
							<FileDownloadOutlined />
						</ListItemIcon>
						<ListItemText>{t("ui.data_grid.export.all_tsv")}</ListItemText>
					</MenuItem>
					<MenuItem
						onClick={() => handleExport("csv", "filtered")}
						disabled={allDataLoading}>
						<ListItemIcon>
							<FileDownloadOutlined />
						</ListItemIcon>
						<ListItemText>{t("ui.data_grid.export.filtered")}</ListItemText>
					</MenuItem>
					<MenuItem
						onClick={() => handleExport("csv", "current")}
						disabled={allDataLoading}>
						<ListItemIcon>
							<FileDownloadOutlined />
						</ListItemIcon>
						<ListItemText>{t("ui.data_grid.export.current")}</ListItemText>
					</MenuItem>
					<MenuItem
						onClick={() => handleExport("csv", "print")}
						disabled={allDataLoading}>
						<ListItemIcon>
							<PrintOutlined />
						</ListItemIcon>
						<ListItemText>{t("ui.data_grid.export.print")}</ListItemText>
					</MenuItem>
				</GridToolbarExportContainer>
			) : (
				// A grid with no export of its own gets the grid's: the current page,
				// labelled by the localeText DataGrid sets.
				<GridToolbarExportContainer>
					<GridCsvExportMenuItem />
					<GridPrintExportMenuItem />
				</GridToolbarExportContainer>
			)}
			{onCleanup && (
				<>
					<Button
						id="actions-button"
						aria-controls={open ? "actions-menu" : undefined}
						aria-haspopup="true"
						aria-expanded={open ? "true" : undefined}
						variant="text"
						size="small"
						onClick={handleMenuClick}
						startIcon={<ChecklistRounded />}>
						{t("ui.actions.title")}
						{selectionCount > 0 && ` (${selectionCount})`}
					</Button>
					<Menu
						id="actions-menu"
						anchorEl={anchorEl}
						open={open}
						onClose={handleMenuClose}
						slotProps={{ list: { "aria-labelledby": "actions-button" } }}>
						<MenuItem
							onClick={handleCleanupClick}
							disabled={selectionCount === 0}>
							<ListItemIcon>
								<CleaningServicesRounded fontSize="small" />
							</ListItemIcon>
							<ListItemText>
								{t("ui.data_grid.cleanup.selected", {
									count: selectionCount,
								})}
							</ListItemText>
						</MenuItem>
					</Menu>
				</>
			)}
		</Toolbar>
	);
}
