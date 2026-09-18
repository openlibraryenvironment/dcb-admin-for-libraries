import { CustomLink } from "@components/CustomLink";
import { detailLinkCell } from "@helpers/dataGrid/detailLinkCell";
import dayjs from "dayjs";
import i18n from "@/i18n";
import { GridColDef } from "@mui/x-data-grid-premium";
import { equalsOnly, standardFilters } from "@constants/filters/filters";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";

export const defaultLocationColumns: GridColDef[] = [
	{
		field: "hostSystemName",
		headerName: i18n.t("grid.headers.host_lms_name"),
		minWidth: 150,
		flex: 0.6,
		filterable: false,
		sortable: false,
		valueGetter: (value, row: { hostSystem: { name: string } }) =>
			row?.hostSystem?.name,
	},
	{
		// The row's handle: the leading cell is the link to this row's detail
		// page, so the grid is navigable without a pointer.
		renderCell: (params) =>
			detailLinkCell(params, (id, label) => (
				<CustomLink to="/locations/$id" params={{ id: id }}>
					{label}
				</CustomLink>
			)),
		field: "name",
		headerName: i18n.t("grid.headers.location_name"),
		minWidth: 150,
		flex: 0.6,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "printLabel",
		headerName: i18n.t("grid.headers.print_label"),
		minWidth: 150,
		flex: 0.6,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "code",
		headerName: i18n.t("grid.headers.location_code"),
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
		headerName: i18n.t("grid.headers.location_uuid"),
		minWidth: 50,
		flex: 0.8,
		sortable: false,
		filterOperators: equalsOnly,
	},
	{
		field: "lastImported",
		headerName: i18n.t("grid.headers.last_imported"),
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
