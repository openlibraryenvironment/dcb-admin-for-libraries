import { currentClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import i18n from "@/i18n";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";
import { standardFilters } from "@constants/filters/filters";
import { GridColDef } from "@mui/x-data-grid-premium";

export const standardRefValueMappingColumns: GridColDef[] = [
	{
		field: "fromCategory",
		headerName: i18n.t("grid.headers.category"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "fromContext",
		headerName: i18n.t("grid.headers.from_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "fromValue",
		headerName: i18n.t("grid.headers.from_value"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "toContext",
		headerName: i18n.t("grid.headers.to_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "toValue",
		headerName: i18n.t("grid.headers.to_value"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
		sortable: true,
		valueGetter: (value: string, row: { toValue: string }) => row?.toValue,
	},
	{
		field: "lastImported",
		headerName: i18n.t("grid.headers.last_imported"),
		minWidth: 100,
		flex: 0.5,
		filterOperators: dateTimeRangeOperators,
		editable: false,
		sortable: true,
		valueGetter: (value: string, row: { lastImported: string }) => {
			const lastImported = row.lastImported;
			const formattedDate = formatTimestamp(lastImported, currentClock());
			if (formattedDate == "Invalid Date") {
				return "";
			} else {
				return formattedDate;
			}
		},
	},
	{
		field: "toCategory",
		headerName: i18n.t("grid.headers.to_category"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
		sortable: true,
		valueGetter: (value: string, row: { toCategory: string }) =>
			row?.toCategory,
	},
];

export const refValueMappingColumnsNoCategoryFilter: GridColDef[] = [
	{
		field: "fromCategory",
		headerName: i18n.t("grid.headers.category"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: true,
		editable: false,
	},
	{
		field: "fromContext",
		headerName: i18n.t("grid.headers.from_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "fromValue",
		headerName: i18n.t("grid.headers.from_value"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "toContext",
		headerName: i18n.t("grid.headers.to_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "toValue",
		headerName: i18n.t("grid.headers.to_value"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		sortable: true,
		editable: true,
		valueGetter: (value: string, row: { toValue: string }) => row?.toValue,
	},
	{
		field: "lastImported",
		headerName: i18n.t("grid.headers.last_imported"),
		minWidth: 100,
		flex: 0.5,
		sortable: true,
		editable: false,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { lastImported: string }) => {
			return row.lastImported ? new Date(row.lastImported) : null;
		},
		valueFormatter: (value: Date) => {
			return formatTimestamp(value, currentClock());
		},
	},
	{
		field: "toCategory",
		headerName: i18n.t("grid.headers.to_category"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
		sortable: true,
		valueGetter: (value: string, row: { toCategory: string }) =>
			row?.toCategory,
	},
];
