import { useClock } from "@/hooks/useThemeStore";
import { PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";
import {
	DataGridPremium,
	GridApiPremium,
	GridColDef,
	GridColumnVisibilityModel,
	GridEventListener,
	GridExpandLessIcon,
	GridExpandMoreIcon,
	GridFeatureMode,
	GridFilterModel,
	GridPaginationModel,
	GridRowModes,
	GridRowModesModel,
	GridRowParams,
	GridRowSelectionModel,
	GridRowsProp,
	GridSortModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { RefObject, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { NoResultsOverlay } from "./components/NoResultsOverlay";
import { useNavigate } from "@tanstack/react-router";
import { appUrl } from "@helpers/appBase";
import { expandedFilterPanelTypes } from "@constants/dataGrid/types";
import { SxProps, Theme, Tooltip, TooltipProps } from "@mui/material";
import ExportToolbar from "./components/ExportToolbar";

declare module "@mui/x-data-grid-premium" {
	interface ToolbarPropsOverrides {
		handleExport?: (fileType: string, exportMode: string) => Promise<void>;
		allDataLoading?: boolean;
		type?: string;
		onCleanup?: () => void;
		selectionCount?: number;
	}
}

/**
 * Where a row in a given grid opens, or null when its rows open nothing.
 *
 * `href` duplicates `navigate` as a string only because window.open needs one:
 * the router has no typed API for opening a tab.
 */
const detailTarget = (
	type: string,
	id: string,
): { navigate: { to: string; params: Record<string, string> }; href: string } | null => {
	switch (type) {
		case "audits":
			return {
				navigate: { to: "/patronRequests/audits/$auditId", params: { auditId: id } },
				href: `/patronRequests/audits/${id}`,
			};
		case "patronRequests":
			return {
				navigate: { to: "/patronRequests/$id", params: { id } },
				href: `/patronRequests/${id}`,
			};
		case "bibs":
			return { navigate: { to: "/bibs/$id", params: { id } }, href: `/bibs/${id}` };
		case "locations":
			return {
				navigate: { to: "/locations/$id", params: { id } },
				href: `/locations/${id}`,
			};
		default:
			return null;
	}
};

/**
 * The grid's tooltips describe rather than name: MUI X's sort icon sits in a
 * bare <span>, which Tooltip would otherwise put aria-label on, where the
 * attribute is prohibited. The icon button inside already carries the name.
 *
 * Scoped to the grid - elsewhere a Tooltip IS an icon button's only name.
 */
const DescribingTooltip = (props: TooltipProps) => (
	<Tooltip {...props} describeChild />
);

interface DataGridProps {
	autoRowHeight?: boolean;
	checkboxSelection: boolean;
	columns: GridColDef[];
	columnVisibilityModel?: GridColumnVisibilityModel;
	disableAggregation: boolean;
	disableHoverInteractions: boolean;
	disablePivoting: boolean;
	disableRowGrouping: boolean;
	editMode?: "cell" | "row"; // Determines cell or row editing
	filterMode: GridFeatureMode; // Determines client or server-side filtering
	filterModel?: GridFilterModel;
	getDetailPanelContent?: any; // Function for returning detail panel content, where applicable
	identifier: string; // The specific type or identifier. Must be unique in the application, as it is used to retrieve data grid settings.
	/** The grid's accessible name. Required: several grids share a page. */
	label: string;
	loading: boolean;
	listViewEnabled: boolean;
	noResultsText: string;
	onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void;
	onFilterModelChange?: (model: GridFilterModel) => void;
	onPaginationModelChange?: any;
	onRowModesModelChange?: (model: GridRowModesModel) => void;
	onRowEditStop?: (params: any, event: any) => void;
	/** Told when an inline edit fails to save, with the message to show. */
	onRowUpdateError?: (message: string) => void;
	onSortModelChange?: (model: GridSortModel) => void;
	pagination: boolean;
	paginationMode: GridFeatureMode; // Determines client or server side pagination
	paginationModel: GridPaginationModel;
	pivotingEnabled: boolean;
	processRowUpdate?: (newRow: any, oldRow: any) => Promise<any> | any;
	rowCount?: number;
	rowModesModel: GridRowModesModel;
	rows: GridRowsProp;
	scrollbarVisible: boolean;
	sortModel?: any;
	sortingMode: GridFeatureMode;
	toolbarVisible: boolean;
	searchText: string;
	styleOverrides?: SxProps<Theme>; // If you are providing style overrides for the Data Grid, you MUST include all styles as this will override everything specified by default in sx
	type: string; // The general type - i.e. "Locations"
	parentApiRef?: RefObject<GridApiPremium | null>;
	enableCleanup?: boolean;
	onCleanup?: () => void;
	onExport?: (fileType: string, exportMode: string) => Promise<void>;
	isExporting?: boolean;
}
export default function DataGrid({
	autoRowHeight,
	checkboxSelection,
	columns,
	columnVisibilityModel,
	disableAggregation,
	disableHoverInteractions,
	disablePivoting,
	disableRowGrouping,
	editMode,
	enableCleanup,
	filterMode,
	filterModel,
	getDetailPanelContent,
	isExporting = false,
	loading,
	label,
	listViewEnabled,
	noResultsText,
	onCleanup,
	onColumnVisibilityModelChange,
	onExport,
	onFilterModelChange,
	onPaginationModelChange,
	onRowModesModelChange,
	onRowEditStop,
	onRowUpdateError,
	onSortModelChange,
	pagination,
	paginationMode,
	paginationModel,
	parentApiRef,
	pivotingEnabled,
	processRowUpdate,
	rowCount,
	rowModesModel,
	rows,
	scrollbarVisible,
	sortModel,
	sortingMode,
	styleOverrides,
	searchText,
	toolbarVisible,
	type,
}: DataGridProps) {
	const { t } = useTranslation();
	const clock = useClock();
	const navigate = useNavigate();
	const expandedFilterPanel = expandedFilterPanelTypes.includes(type);
	const getDetailPanelHeight = useCallback(() => "auto", []); // Only necessary because master detail is not applicable to all grids yet
	const internalApiRef = useGridApiRef();
	const apiRef = parentApiRef || internalApiRef;

	const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
		type: "include",
		ids: new Set(),
	});
	const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
		// Don't let them navigate away if editing is present
		if (rowModesModel[params?.row?.id]?.mode === GridRowModes.Edit) {
			event.defaultMuiPrevented = true;
			return;
		}

		const target = detailTarget(type, String(params?.row?.id));
		if (!target) {
			return;
		}

		if (event.ctrlKey || event.metaKey) {
			window.open(appUrl(target.href), "_blank");
			return;
		}
		navigate(target.navigate);
	};

	// Remounted when the clock preference changes, because a column's
	// valueFormatter is a plain function whose output MUI X does not treat as
	// part of a cell's identity - a re-render alone leaves the old text on
	// screen. The cost is the grid's scroll position, on a setting nobody
	// changes twice.
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<DataGridPremium
				key={clock}
				aria-label={label}
				apiRef={apiRef}
				checkboxSelection={checkboxSelection}
				columns={columns}
				columnVisibilityModel={columnVisibilityModel}
				disableAggregation={disableAggregation}
				disableRowGrouping={disableRowGrouping}
				disableRowSelectionOnClick
				disablePivoting={disablePivoting}
				editMode={editMode}
				filterMode={filterMode}
				filterModel={filterModel}
				getDetailPanelContent={getDetailPanelContent}
				getDetailPanelHeight={getDetailPanelHeight}
				// May need initial state passed in like serverpaginated grid
				getRowHeight={autoRowHeight ? () => "auto" : () => null}
				listView={listViewEnabled}
				loading={loading}
				localeText={{
					toolbarQuickFilterPlaceholder: searchText ?? t("ui.actions.search"),
					columnsManagementSearchTitle: t("ui.data_grid.find_column"),
					toolbarExportCSV: t("ui.data_grid.export.current"),
					toolbarExportPrint: t("ui.data_grid.export.print"),
					filterOperatorDoesNotEqual: t("ui.data_grid.filters.not_equal"),
					"filterOperator!=": t("ui.data_grid.filters.not_equal"),
					"filterOperator=": t("ui.data_grid.filters.equals"),
					"filterOperator>": t("ui.data_grid.filters.greater_than_exclusive"),
					"filterOperator>=": t("ui.data_grid.filters.greater_than_inclusive"),
					"filterOperator<": t("ui.data_grid.filters.less_than_exclusive"),
					"filterOperator<=": t("ui.data_grid.filters.less_than_inclusive"),
				}} // Overrides for data grid text
				onCellDoubleClick={(params, event) => {
					// Prevent default double-click edit behavior
					event.defaultMuiPrevented = true;
				}}
				onColumnVisibilityModelChange={onColumnVisibilityModelChange}
				onFilterModelChange={onFilterModelChange}
				onPaginationModelChange={onPaginationModelChange}
				onProcessRowUpdateError={(params: GridRowParams) => {
					const name = params?.row?.name ?? params?.row?.fullName;
					onRowUpdateError?.(
						t("common.update_failure", {
							// entities.* are already lowercase singulars written for exactly
							// this sentence, so no toLowerCase() is needed on them.
							entity:
								type === "ReferenceValueMapping"
									? t("entities.reference_value_mapping")
									: type === "NumericRangeMapping"
										? t("entities.numeric_range_mapping")
										: type?.toLowerCase(),
							name: name,
						}),
					);
				}}
				onSortModelChange={onSortModelChange}
				onRowClick={handleRowClick}
				onRowSelectionModelChange={(newSelection) => {
					setSelectionModel(newSelection);
				}}
				pageSizeOptions={PAGE_SIZE_OPTIONS}
				pagination={pagination}
				paginationMode={paginationMode}
				paginationModel={paginationModel}
				pivotActive={pivotingEnabled}
				processRowUpdate={processRowUpdate}
				rowModesModel={rowModesModel}
				onRowEditStop={onRowEditStop}
				onRowModesModelChange={onRowModesModelChange}
				rowCount={paginationMode === "server" ? rowCount : undefined}
				rows={rows}
				rowSelectionModel={selectionModel}
				showToolbar={toolbarVisible}
				sortingMode={sortingMode}
				sortModel={sortModel}
				slots={{
					baseTooltip: DescribingTooltip,
					detailPanelExpandIcon: GridExpandMoreIcon,
					detailPanelCollapseIcon: GridExpandLessIcon,
					noRowsOverlay: () => (
						<NoResultsOverlay noResultsMessage={noResultsText} />
					),
					noResultsOverlay: () => (
						<NoResultsOverlay noResultsMessage={noResultsText} />
					),
					// EVERY grid, not just patron requests. MUI's stock GridToolbar paints a
					// filter button whose visible text is "Filters" and whose accessible
					// name is "Show filters", with an always-rendered "0" badge inside it -
					// WCAG 2.5.3 Label in Name, caught once the axe gate was actually
					// running the WCAG tag sets. Our own toolbar already branches on
					// `type` for its export items, so it was written for this.
					toolbar: ExportToolbar,
				}}
				slotProps={{
					toolbar: {
						showQuickFilter: false,
						handleExport: onExport, // Pass the export handler
						excelOptions: { disableToolbarButton: true },
						allDataLoading: isExporting, // Pass the loading state
						type: type, // Pass type to determine menu options
						onCleanup: enableCleanup ? onCleanup : undefined, // Pass cleanup handler
						selectionCount: selectionModel?.ids?.size || 0,
					},
					filterPanel: expandedFilterPanel
						? {
								sx: {
									"& .MuiDataGrid-filterFormValueInput": { minWidth: 420 }, // ideally this would be dynamic. something stopping the date-time-range picker from accepting this. If it can't be dynamic it should only apply to grids of that nature
								},
							}
						: undefined,
				}}
				sx={{
					border: "0",
					minHeight: rows.length === 0 ? "400px" : undefined, // ensures that if there's nothing there, we still see loading etc
					"@media print": {
						".MuiDataGrid-main": { color: "rgba(0, 0, 0, 0.87)" },
					},
					// "& .MuiDataGrid-cell--editable": {
					// 	bgcolor: (theme.vars || theme).palette.primary.editableFieldBackground,
					// }, // How to signal editable cells.
					".MuiDataGrid-virtualScroller": {
						overflow: scrollbarVisible ? "" : "hidden",
					},
					// both hover styles need to be added, otherwise a flashing effect appears when hovering
					// https://stackoverflow.com/questions/76563478/disable-hover-effect-on-mui-datagrid
					"& .MuiDataGrid-row.Mui-hovered": {
						backgroundColor: disableHoverInteractions ? "transparent" : "",
					},
					"& .MuiDataGrid-row:hover": {
						backgroundColor: disableHoverInteractions ? "transparent" : "",
					},
					"& .MuiDataGrid-cell:focus": {
						outline: disableHoverInteractions ? "none" : "",
					},
					"& .MuiDataGrid-detailPanel": {
						overflow: "hidden", // Prevent scrollbars in the detail panel
						height: "auto", // Adjust height automatically
					},

					// CUSTOM OVERRIDES (will merge with and override base styles so be careful)
					...styleOverrides,
				}}
			/>
		</div>
	);
}
