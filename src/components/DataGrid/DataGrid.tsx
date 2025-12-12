import {
	DataGridPremium,
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
	GridRowsProp,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { NoResultsOverlay } from "./components/NoResultsOverlay";
import { useNavigate } from "@tanstack/react-router";
import {
	nonClickableTypes,
	specialRedirectionTypes,
} from "@constants/dataGrid/types";
import { SxProps, Theme } from "@mui/material";

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
	loading: boolean;
	listViewEnabled: boolean;
	noResultsText: string;
	onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void;
	onFilterModelChange?: (model: GridFilterModel) => void;
	// onPaginationModelChange: (model: GridPaginationModel) => void;
	onPaginationModelChange?: any;
	onRowModesModelChange?: (model: GridRowModesModel) => void;
	onRowEditStop?: (params: any, event: any) => void;
	onSortModelChange?: (model: GridSortModel) => void;
	pagination: boolean;
	paginationMode: GridFeatureMode; // Determines client or server side pagination
	paginationModel: GridPaginationModel;
	pivotingEnabled: boolean;
	processRowUpdate?: (newRow: any, oldRow: any) => Promise<any> | any;
	rowCount: number;
	rowModesModel: GridRowModesModel;
	rows: GridRowsProp;
	scrollbarVisible: boolean;
	// sortModel: GridSortModel;
	sortModel?: any;
	sortingMode: GridFeatureMode;
	toolbarVisible: boolean;
	searchText: string;
	styleOverrides?: SxProps<Theme>; // If you are providing style overrides for the Data Grid, you MUST include all styles as this will override everything specified by default in sx
	type: string; // The general type - i.e. "Locations"
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
	filterMode,
	filterModel,
	getDetailPanelContent,
	loading,
	listViewEnabled,
	noResultsText,
	onColumnVisibilityModelChange,
	onFilterModelChange,
	onPaginationModelChange,
	onRowModesModelChange,
	onRowEditStop,
	onSortModelChange,
	pagination,
	paginationMode,
	paginationModel,
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
	const navigate = useNavigate();
	const getDetailPanelHeight = useCallback(() => "auto", []); // Only necessary because master detail is not applicable to all grids yet
	const [alert, setAlert] = useState<any>({
		open: false,
		severity: "success",
		text: null,
	}); // We do need to give feedback on editing s
	const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
		//UseNavigateResult<string>
		console.log(type, params);

		if (rowModesModel[params?.row?.id]?.mode !== GridRowModes.Edit) {
			// Some grids, like the PRs on the library page, need special redirection
			if (specialRedirectionTypes.includes(type)) {
				if (event.ctrlKey || event.metaKey)
					if (type == "audits") {
						console.log("Type match");
						if (event.ctrlKey || event.metaKey) {
							window.open(
								`/patronRequests/audits/${params?.row?.id}`,
								"_blank"
							);
						} else {
							navigate({ to: `/patronRequests/audits/${params?.row?.id}` });
						}
					} else {
						window.open(`/patronRequests/${params?.row?.id}`, "_blank");
					}
				if (!(event.ctrlKey || event.metaKey))
					if (type == "audits") {
						console.log("Type match");
						if (event.ctrlKey || event.metaKey) {
							window.open(
								`/patronRequests/audits/${params?.row?.id}`,
								"_blank"
							);
						} else {
							navigate({ to: `/patronRequests/audits/${params?.row?.id}` });
						}
					} else {
						navigate({ to: `/patronRequests/${params?.row?.id}` });
					}
			} else if (
				// Others we don't want users to be able to click through on
				!nonClickableTypes.includes(type)
			) {
				if (event.ctrlKey || event.metaKey)
					window.open(`/${type}/${params?.row?.id}`, "_blank");
				if (!(event.ctrlKey || event.metaKey))
					navigate({ to: `/${type}/${params?.row?.id}` });
			}
		} else {
			// Don't let them navigate away if editing is present
			event.defaultMuiPrevented = true;
		}
	};

	// To make it really explicit that these things are only meant to be undefined if pagination mode is not srver
	const finalOnPaginationModelChange =
		paginationMode === "server" ? onPaginationModelChange : undefined;
	const finalOnFilterModelChange =
		filterMode === "server" ? onFilterModelChange : undefined;
	const finalOnSortModelChange =
		sortingMode === "server" ? onSortModelChange : undefined;

	//identifier may not be needed
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<DataGridPremium
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
					toolbarQuickFilterPlaceholder: searchText ?? t("general.search"),
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
				onFilterModelChange={finalOnFilterModelChange}
				onPaginationModelChange={finalOnPaginationModelChange}
				//@ts-expect-error Until we fix the typing issues, expect an error here.
				onProcessRowUpdateError={(params: GridRowParams, error: string) => {
					// fix typing
					console.error("Error updating row:", error);
					const name = params?.row?.name ?? params?.row?.fullName;
					setAlert({
						open: true,
						severity: "error",
						text: t("ui.data_grid.edit_error", {
							entity:
								type === "ReferenceValueMapping"
									? t("mappings.ref_value_one").toLowerCase()
									: type === "NumericRangeMapping"
										? t("mappings.num_range_one").toLowerCase()
										: type?.toLowerCase(),
							name: name,
						}),
					});
				}}
				onSortModelChange={finalOnSortModelChange}
				onRowClick={handleRowClick}
				pageSizeOptions={[5, 10, 20, 25, 30, 40, 50, 100, 200]}
				pagination={pagination}
				paginationMode={paginationMode}
				paginationModel={paginationModel}
				pivotActive={pivotingEnabled}
				processRowUpdate={processRowUpdate}
				rowModesModel={rowModesModel}
				onRowEditStop={onRowEditStop}
				onRowModesModelChange={onRowModesModelChange}
				rowCount={rowCount}
				rows={rows}
				showToolbar={toolbarVisible}
				sortingMode={sortingMode}
				sortModel={sortModel}
				slots={{
					detailPanelExpandIcon: GridExpandMoreIcon,
					detailPanelCollapseIcon: GridExpandLessIcon,
					noResultsOverlay: () => (
						<NoResultsOverlay noResultsMessage={noResultsText} />
					),
				}}
				slotProps={{ toolbar: { showQuickFilter: false } }}
				sx={{
					border: "0",
					minHeight: rows.length === 0 ? "400px" : undefined, // ensures that if there's nothing there, we still see loading etc
					"@media print": {
						".MuiDataGrid-main": { color: "rgba(0, 0, 0, 0.87)" },
					},
					// "& .MuiDataGrid-cell--editable": {
					// 	bgcolor: theme.palette.primary.editableFieldBackground,
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
					// --- CUSTOM OVERRIDES (will merge with and override base styles) ---
					...styleOverrides,
				}}
			/>
		</div>
	);
}
