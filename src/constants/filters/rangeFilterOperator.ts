import RangeFilter from "@components/DataGrid/components/RangeFilter";
import { GridFilterOperator } from "@mui/x-data-grid-premium";
import i18n from "@/i18n";

export const betweenFilterOperator: GridFilterOperator = {
	label: i18n.t("ui.data_grid.filters.between"),
	value: "between",
	getApplyFilterFn: () => {
		return () => true;
	},
	InputComponent: RangeFilter,
};
