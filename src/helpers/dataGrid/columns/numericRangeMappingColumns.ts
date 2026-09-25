import { currentClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import i18n from "@/i18n";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";
import { equalsOnly, standardFilters } from "@constants/filters/filters";
import { GridColDef } from "@mui/x-data-grid-premium";
export const standardNumRangeMappingColumns: GridColDef[] = [
	{
		field: "domain",
		headerName: i18n.t("grid.headers.category"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "context",
		headerName: i18n.t("grid.headers.from_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "lowerBound",
		headerName: i18n.t("grid.headers.lower_bound"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "upperBound",
		headerName: i18n.t("grid.headers.upper_bound"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "targetContext",
		headerName: i18n.t("grid.headers.to_context"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "mappedValue",
		headerName: i18n.t("grid.headers.mapped_value"),
		minWidth: 50,
		flex: 0.5,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "lastImported",
		headerName: i18n.t("grid.headers.last_imported"),
		minWidth: 100,
		flex: 0.5,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { lastImported: string }) => {
			return row.lastImported ? new Date(row.lastImported) : null;
		},
		valueFormatter: (value: Date) => {
			return formatTimestamp(value, currentClock());
		},
	},
];

export const numRangeMappingColumnsNoCategoryFilter: GridColDef[] = [
	{
		field: "domain",
		headerName: i18n.t("grid.headers.category"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "context",
		headerName: i18n.t("grid.headers.from_context"),
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "lowerBound",
		headerName: i18n.t("grid.headers.lower_bound"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "upperBound",
		headerName: i18n.t("grid.headers.upper_bound"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "targetContext",
		headerName: i18n.t("grid.headers.to_context"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "mappedValue",
		headerName: i18n.t("grid.headers.mapped_value"),
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
	},
	{
		field: "lastImported",
		headerName: i18n.t("grid.headers.last_imported"),
		minWidth: 100,
		flex: 0.5,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { lastImported: string }) => {
			return row.lastImported ? new Date(row.lastImported) : null;
		},
		valueFormatter: (value: Date) => {
			return formatTimestamp(value, currentClock());
		},
	},
];
