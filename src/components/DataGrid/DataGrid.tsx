import {
	DataGridPremium,
	GridColDef,
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

interface DataGridProps {
	checkboxSelection: boolean;
	columns: GridColDef[];
	disableAggregation: boolean;
	disableHoverInteractions: boolean;
	disableRowGrouping: boolean;
	editMode: "cell" | "row"; // Determines cell or row editing
	filterMode: GridFeatureMode; // Determines client or server-side filtering
	filterModel: GridFilterModel;
	getDetailPanelContent?: any; // Function for returning detail panel content, where applicable
	identifier: string; // The specific type or identifier. Must be unique in the application, as it is used to retrieve data grid settings.
	loading: boolean;
	listViewEnabled: boolean;
	noResultsText: string;
	onFilterModelChange?: (model: GridFilterModel) => void;
	// onPaginationModelChange: (model: GridPaginationModel) => void;
	onPaginationModelChange: any;
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
	sortModel: any;
	sortingMode: GridFeatureMode;
	toolbarVisible: boolean;
	searchText: string;
	type: string; // The general type - i.e. "Locations"
}
export default function DataGrid({
	checkboxSelection,
	columns,
	disableAggregation,
	disableHoverInteractions,
	disableRowGrouping,
	editMode,
	filterMode,
	filterModel,
	getDetailPanelContent,
	identifier,
	loading,
	listViewEnabled,
	noResultsText,
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
	toolbarVisible,
	searchText,
	type,
}: DataGridProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const getDetailPanelHeight = useCallback(() => "auto", []); // Only necessary because master detail is not applicable to all grids yet
	const [alert, setAlert] = useState<any>({
		open: false,
		severity: "success",
		text: null,
	});
	const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
		//UseNavigateResult<string>

		if (rowModesModel[params?.row?.id]?.mode !== GridRowModes.Edit) {
			// Some grids, like the PRs on the library page, need special redirection
			if (specialRedirectionTypes.includes(type)) {
				if (event.ctrlKey || event.metaKey)
					window.open(`/patronRequests/${params?.row?.id}`, "_blank");
				if (!(event.ctrlKey || event.metaKey))
					navigate({ to: `/patronRequests/${params?.row?.id}` });
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
	//identifier may not be needed
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<DataGridPremium
				checkboxSelection={checkboxSelection}
				columns={columns}
				disableAggregation={disableAggregation}
				disableRowGrouping={disableRowGrouping}
				editMode={editMode}
				filterMode={filterMode}
				filterModel={filterModel}
				getDetailPanelContent={getDetailPanelContent}
				getDetailPanelHeight={getDetailPanelHeight}
				// May need initial state passed in like serverpaginated grid
				listView={listViewEnabled}
				loading={loading}
				localeText={{
					toolbarQuickFilterPlaceholder: searchText ?? t("general.search"),
					columnsManagementSearchTitle: t("ui.data_grid.find_column"),
					toolbarExportCSV: t("ui.data_grid.download_current_page"),
					toolbarExportPrint: t("ui.data_grid.print_current_page"),
					filterOperatorDoesNotEqual: t("ui.data_grid.filters.not_equal"),
					"filterOperator!=": t("ui.data_grid.filters.not_equal"),
					"filterOperator=": t("ui.data_grid.filters.equals"),
					"filterOperator>": t("ui.data_grid.filters.greater_than_exclusive"),
					"filterOperator>=": t("ui.data_grid.filters.greater_than_inclusive"),
					"filterOperator<": t("ui.data_grid.filters.less_than_exclusive"),
					"filterOperator<=": t("ui.data_grid.filters.less_than_inclusive"),
				}} // Overrides for data grid text
				onFilterModelChange={onFilterModelChange}
				onPaginationModelChange={onPaginationModelChange}
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
				onSortModelChange={onSortModelChange}
				onRowClick={handleRowClick}
				pageSizeOptions={[5, 10, 20, 30, 40, 50, 100, 200]}
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
				sx={{
					border: "0",
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
				}}
			/>
		</div>
	);
}
