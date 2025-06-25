import {
	DataGridPremium,
	GridColDef,
	GridRowsProp,
} from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";

interface DataGridProps {
	checkboxSelection: boolean;
	columns: GridColDef[];
	disableAggregation: boolean;
	disableHoverInteractions: boolean;
	disableRowGrouping: boolean;
	identifier: string; // The specific type or identifier. Must be unique in the application, as it is used to retrieve data grid settings.
	loading: boolean;
	listViewEnabled: boolean;
	pagination: boolean;
	pivotingEnabled: boolean;
	rows: GridRowsProp;
	scrollbarVisible: boolean;
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
	loading,
	listViewEnabled,
	pagination,
	pivotingEnabled,
	rows,
	scrollbarVisible,
	toolbarVisible,
	searchText,
}: DataGridProps) {
	const { t } = useTranslation();
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<DataGridPremium
				checkboxSelection={checkboxSelection}
				columns={columns}
				disableAggregation={disableAggregation}
				disableRowGrouping={disableRowGrouping}
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
				pageSizeOptions={[5, 10, 20, 30, 40, 50, 100, 200]}
				pagination={pagination}
				pivotActive={pivotingEnabled}
				rows={rows}
				showToolbar={toolbarVisible}
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
