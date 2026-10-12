import { generateFilterDescription } from "@helpers/dataGrid/utilities";
import { exportColumnsOf } from "@helpers/dataGrid/exportOptions";
import type { GridExportConfig } from "@/hooks/useExport";
import {
	ChecklistRounded,
	CleaningServicesRounded,
	FileDownloadOutlined,
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
	gridColumnDefinitionsSelector,
	gridColumnVisibilityModelSelector,
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
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ExportWizard from "./ExportWizard";

interface ExportToolbarProps {
	exportConfig?: GridExportConfig;
	allDataLoading?: boolean;
	onCleanup?: () => void;
}

/** A child of GridToolbarExportContainer, which hands each child the means to close its menu. */
function OpenExportWizardMenuItem({
	hideMenu,
	onOpen,
	disabled,
}: {
	hideMenu?: () => void;
	onOpen: () => void;
	disabled?: boolean;
}) {
	const { t } = useTranslation();
	return (
		<MenuItem
			disabled={disabled}
			onClick={() => {
				hideMenu?.();
				onOpen();
			}}>
			<ListItemIcon>
				<FileDownloadOutlined />
			</ListItemIcon>
			<ListItemText>{t("ui.data_grid.export.wizard")}</ListItemText>
		</MenuItem>
	);
}

export default function ExportToolbar({
	exportConfig,
	allDataLoading,
	onCleanup,
}: ExportToolbarProps) {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);
	// Remounting the wizard on every open starts it from the grid as it is now.
	const [wizard, setWizard] = useState({ open: false, key: 0 });
	const exportButtonRef = useRef<HTMLButtonElement>(null);

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
	const columnDefinitions = useGridSelector(apiRef, gridColumnDefinitionsSelector);
	const columnVisibility = useGridSelector(apiRef, gridColumnVisibilityModelSelector);
	const filterTooltipText = generateFilterDescription(filterModel);
	const hasFilters =
		filterModel.items.some(
			(item) => item.value !== undefined && item.value !== null && item.value !== "",
		) || (filterModel.quickFilterValues ?? []).length > 0;

	const exportColumns = useMemo(() => {
		const own = exportColumnsOf(columnDefinitions);
		const fields = new Set(own.map((column) => column.field));
		return [
			...own,
			...(exportConfig?.extraColumns ?? []).filter((column) => !fields.has(column.field)),
		];
	}, [columnDefinitions, exportConfig?.extraColumns]);

	const initiallySelected = useMemo(
		() =>
			new Set(
				exportColumns
					.filter((column) => columnVisibility[column.field] !== false)
					.map((column) => column.field),
			),
		[exportColumns, columnVisibility],
	);

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
			{/* Current page and print are the grid's own, labelled by the localeText DataGrid
			    sets; everything else goes through the wizard and the library guard. */}
			<GridToolbarExportContainer ref={exportButtonRef}>
				{exportConfig && (
					<OpenExportWizardMenuItem
						disabled={allDataLoading}
						onOpen={() => setWizard(({ key }) => ({ open: true, key: key + 1 }))}
					/>
				)}
				<GridCsvExportMenuItem />
				<GridPrintExportMenuItem />
			</GridToolbarExportContainer>
			{exportConfig && (
				<ExportWizard
					key={wizard.key}
					open={wizard.open}
					onClose={() => setWizard(({ key }) => ({ open: false, key }))}
					// The menu item that opened it is gone, so MUI's own restore would land on <body>.
					onExited={() => exportButtonRef.current?.focus()}
					columns={exportColumns}
					initiallySelected={initiallySelected}
					defaultFileName={exportConfig.defaultFileName}
					hasFilters={hasFilters}
					filterSummary={filterTooltipText}
					selectedCount={selectionCount}
					onExport={(options) => void exportConfig.run(options)}
				/>
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
