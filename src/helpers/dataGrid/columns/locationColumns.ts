import dayjs from "dayjs";
import i18n from "@/i18n";
import { GridColDef } from "@mui/x-data-grid-premium";
import { equalsOnly, standardFilters } from "@constants/filters/filters";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";

export const defaultLocationColumns: GridColDef[] = [
	{
		field: "hostSystemName",
		headerName: "Host LMS name",
		minWidth: 150,
		flex: 0.6,
		filterable: false,
		sortable: false,
		valueGetter: (value, row: { hostSystem: { name: string } }) =>
			row?.hostSystem?.name,
	},
	{
		field: "name",
		headerName: "Location name",
		minWidth: 150,
		flex: 0.6,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "printLabel",
		headerName: "Print label",
		minWidth: 150,
		flex: 0.6,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "code",
		headerName: "Location code",
		minWidth: 50,
		flex: 0.4,
		filterOperators: standardFilters,
	},
	{
		field: "isPickup",
		headerName: i18n.t("location.pickup_status"),
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
		sortable: false,
		valueFormatter: (value: boolean) => {
			if (value == true) {
				return i18n.t("ui.feedback.enabled");
			} else if (value == false) {
				return i18n.t("ui.feedback.disabled");
			} else {
				return i18n.t("ui.feedback.not_set");
			}
		},
	},
	{
		field: "localId",
		headerName: i18n.t("location.local_id"),
		minWidth: 50,
		flex: 0.8,
		filterOperators: equalsOnly,
		sortable: false,
		editable: true,
	},
	{
		field: "id",
		headerName: "Location UUID",
		minWidth: 50,
		flex: 0.8,
		sortable: false,
		filterOperators: equalsOnly,
	},
	{
		field: "lastImported",
		headerName: "Last imported",
		minWidth: 100,
		flex: 0.5,
		sortable: true,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { lastImported: string }) => {
			return row.lastImported ? new Date(row.lastImported) : null;
		},
		valueFormatter: (value: Date) => {
			return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "";
		},
	},
	{
		field: "isPickupAnywhere",
		headerName: i18n.t("location.pickup_anywhere_status"),
		minWidth: 50,
		flex: 0.4,
		sortable: false,
		filterOperators: equalsOnly,
		valueFormatter: (value: boolean) => {
			if (value == true) {
				return i18n.t("ui.feedback.enabled");
			} else if (value == false) {
				return i18n.t("ui.feedback.disabled");
			} else {
				return i18n.t("ui.feedback.not_set");
			}
		},
	},
];
