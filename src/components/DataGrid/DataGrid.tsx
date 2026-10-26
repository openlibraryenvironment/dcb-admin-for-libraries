import { useAppLocale } from "@/hooks/useLocaleStore";
import { useClock } from "@/hooks/useThemeStore";
import { useAnnounce } from "@/hooks/useAnnouncer";
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
	GridRowsProp,
	GridSortDirection,
	GridSortModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NoResultsOverlay } from "./components/NoResultsOverlay";
import { useNavigate } from "@tanstack/react-router";
import { appUrl } from "@helpers/appBase";
import { expandedFilterPanelTypes } from "@constants/dataGrid/types";
import { SxProps, Theme, Tooltip, TooltipProps } from "@mui/material";
import ExportToolbar from "./components/ExportToolbar";
import type { GridExportConfig } from "@/hooks/useExport";
import type { ColumnLayout, GridViews } from "@/hooks/useSyncedDataGrid";
import { useColumnLayout } from "./useColumnLayout";
import { ColumnMenuMoveItem } from "./components/ColumnMenuMoveItem";

declare module "@mui/x-data-grid-premium" {
	interface ToolbarPropsOverrides {
		exportConfig?: GridExportConfig;
		allDataLoading?: boolean;
		onCleanup?: () => void;
		views?: GridViews;
	}
	interface NoRowsOverlayPropsOverrides {
		noResultsMessage?: string;
	}
	interface NoResultsOverlayPropsOverrides {
		noResultsMessage?: string;
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

// The server always orders: an "unsorted" step would show no aria-sort over rows it ordered
const SERVER_SORTING_ORDER: readonly GridSortDirection[] = ["asc", "desc"];

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
	/** Pinning and order from the grid's URL (useSyncedDataGrid's columnLayout). */
	columnLayout?: ColumnLayout;
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
	onPaginationModelChange?: (model: GridPaginationModel) => void;
	onRowModesModelChange?: (model: GridRowModesModel) => void;
	onRowEditStop?: (params: any, event: any) => void;
	/** Told when processRowUpdate rejects, with what it rejected with. */
	onRowUpdateError?: (error: unknown) => void;
	onSortModelChange?: (model: GridSortModel) => void;
	pagination: boolean;
	paginationMode: GridFeatureMode; // Determines client or server side pagination
	paginationModel: GridPaginationModel;
	pivotingEnabled: boolean;
	processRowUpdate?: (newRow: any, oldRow: any) => Promise<any> | any;
	rowCount?: number;
	rowModesModel: GridRowModesModel;
	rows: GridRowsProp;
	sortModel?: any;
	sortingMode: GridFeatureMode;
	toolbarVisible: boolean;
	searchText: string;
	styleOverrides?: SxProps<Theme>; // If you are providing style overrides for the Data Grid, you MUST include all styles as this will override everything specified by default in sx
	type: string; // The general type - i.e. "Locations"
	parentApiRef?: RefObject<GridApiPremium | null>;
	enableCleanup?: boolean;
	onCleanup?: () => void;
	exportConfig?: GridExportConfig;
	isExporting?: boolean;
	/** A URL-synced grid's view, which its toolbar can share as a link and save. */
	views?: GridViews;
}

// Module scope: a new function each render made MUI X re-measure every row on every render
const AUTO_ROW_HEIGHT = () => "auto" as const;
const DEFAULT_ROW_HEIGHT = () => null;

export default function DataGrid({
	autoRowHeight,
	checkboxSelection,
	columns,
	columnLayout,
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
	exportConfig,
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
	sortModel,
	sortingMode,
	styleOverrides,
	searchText,
	toolbarVisible,
	type,
	views,
}: DataGridProps) {
	const { t } = useTranslation();
	const clock = useClock();
	const locale = useAppLocale();
	const navigate = useNavigate();
	const expandedFilterPanel = expandedFilterPanelTypes.includes(type);
	const getDetailPanelHeight = useCallback(() => "auto", []); // Only necessary because master detail is not applicable to all grids yet
	const internalApiRef = useGridApiRef();
	const apiRef = parentApiRef || internalApiRef;
	const remountKey = `${clock}|${locale}|${columnLayout?.visit ?? 0}`;
	const layout = useColumnLayout(apiRef, columns, columnLayout, remountKey);

	const announce = useAnnounce();
	// The server's count after a filter, sort or page change has settled. The
	// first settle is the page arriving, which the route title already announced.
	const settledQuery = useRef<string | null>(null);
	const settledSort = useRef<string | null>(null);
	useEffect(() => {
		if (loading || paginationMode !== "server" || rowCount === undefined) {
			return;
		}
		const query = JSON.stringify([
			filterModel,
			sortModel,
			paginationModel,
			rowCount,
		]);
		const sort = JSON.stringify(sortModel);
		if (settledQuery.current === null) {
			settledQuery.current = query;
			settledSort.current = sort;
			return;
		}
		if (settledQuery.current === query) return;
		settledQuery.current = query;
		const sortChanged = settledSort.current !== sort;
		settledSort.current = sort;
		// A sort leaves the count as it was: say what changed, the order
		const [sorted] = (sortModel ?? []) as GridSortModel;
		const column = sorted?.sort
			? columns.find((each) => each.field === sorted.field)?.headerName
			: undefined;
		announce(
			sortChanged && column
				? t("ui.data_grid.results_sorted", {
						count: rowCount,
						column,
						direction: t(`ui.data_grid.sort_${sorted.sort}`),
					})
				: t("ui.data_grid.results", { count: rowCount }),
		);
	}, [
		loading,
		paginationMode,
		rowCount,
		filterModel,
		sortModel,
		paginationModel,
		columns,
		announce,
		t,
	]);

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

	// Remounted when the clock or the locale changes, because a column's
	// valueFormatter is a plain function whose output MUI X does not treat as
	// part of a cell's identity - a re-render alone leaves the old text on
	// screen. The cost is the grid's scroll position, on a setting nobody
	// changes twice.
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<DataGridPremium
				key={remountKey}
				aria-label={label}
				apiRef={apiRef}
				checkboxSelection={checkboxSelection}
				columns={layout.columns}
				columnVisibilityModel={columnVisibilityModel}
				pinnedColumns={layout.pinnedColumns}
				onPinnedColumnsChange={layout.onPinnedColumnsChange}
				disableAggregation={disableAggregation}
				disableRowGrouping={disableRowGrouping}
				disableRowSelectionOnClick
				disablePivoting={disablePivoting}
				// The server takes one order and the URL holds one sort: a second column would show an arrow nothing applies
				disableMultipleColumnsSorting={sortingMode === "server"}
				// Spread, not `undefined`: MUI's defaults are spread under the props, so an explicit
				// undefined replaces its sorting order and a client-sorted grid crashes
				{...(sortingMode === "server" ? { sortingOrder: SERVER_SORTING_ORDER } : {})}
				editMode={editMode}
				filterMode={filterMode}
				filterModel={filterModel}
				getDetailPanelContent={getDetailPanelContent}
				getDetailPanelHeight={getDetailPanelHeight}
				// May need initial state passed in like serverpaginated grid
				getRowHeight={autoRowHeight ? AUTO_ROW_HEIGHT : DEFAULT_ROW_HEIGHT}
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
				onProcessRowUpdateError={onRowUpdateError}
				onSortModelChange={onSortModelChange}
				onRowClick={handleRowClick}
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
				showToolbar={toolbarVisible}
				sortingMode={sortingMode}
				sortModel={sortModel}
				slots={{
					baseTooltip: DescribingTooltip,
					detailPanelExpandIcon: GridExpandMoreIcon,
					detailPanelCollapseIcon: GridExpandLessIcon,
					noRowsOverlay: NoResultsOverlay,
					noResultsOverlay: NoResultsOverlay,
					// EVERY grid, not just patron requests. MUI's stock GridToolbar paints a
					// filter button whose visible text is "Filters" and whose accessible
					// name is "Show filters", with an always-rendered "0" badge inside it -
					// WCAG 2.5.3 Label in Name, caught once the axe gate was actually
					// running the WCAG tag sets.
					toolbar: ExportToolbar,
				}}
				slotProps={{
					toolbar: {
						showQuickFilter: false,
						exportConfig,
						excelOptions: { disableToolbarButton: true },
						allDataLoading: isExporting, // Pass the loading state
						onCleanup: enableCleanup ? onCleanup : undefined, // Pass cleanup handler
						views,
					},
					// A menu or panel is page content: rendered in the grid's landmark or dialog, not after
					// <main> at the end of <body>, where axe's region rule finds it outside every landmark
					basePopper: {
						material: {
							container: () =>
								apiRef.current?.rootElementRef?.current?.closest<HTMLElement>(
									"main, [role='dialog']",
								) ?? document.body,
						},
					},
					columnMenu: {
						slots: { columnMenuMoveItem: ColumnMenuMoveItem },
						// After pinning (15), before filtering (20)
						slotProps: { columnMenuMoveItem: { displayOrder: 16 } },
					},
					noRowsOverlay: { noResultsMessage: noResultsText },
					noResultsOverlay: { noResultsMessage: noResultsText },
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
					// Room for the loading and no-rows overlays when there are no rows.
					minHeight: rows.length === 0 ? (theme) => theme.spacing(50) : undefined,
					"@media print": {
						".MuiDataGrid-main": { color: "common.black" },
					},
					// both hover styles need to be added, otherwise a flashing effect appears when hovering
					// https://stackoverflow.com/questions/76563478/disable-hover-effect-on-mui-datagrid
					"& .MuiDataGrid-row.Mui-hovered": {
						backgroundColor: disableHoverInteractions ? "transparent" : "",
					},
					"& .MuiDataGrid-row:hover": {
						backgroundColor: disableHoverInteractions ? "transparent" : "",
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
