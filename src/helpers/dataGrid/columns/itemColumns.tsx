import { formatDate } from "@helpers/formatters";
import i18n from "@/i18n";
import {
	GridColDef,
	GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
} from "@mui/x-data-grid-premium";
import { DetailPanelToggle } from "@components/MasterDetail/components/DetailPanelToggle/DetailPanelToggle";
import DetailPanelHeader from "@components/MasterDetail/components/DetailPanelHeader/DetailPanelHeader";

export const itemColumns: GridColDef[] = [
	{
		...GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
		headerName: i18n.t("ui.data_grid.master_detail"),
		renderCell: (params) => (
			<DetailPanelToggle id={params.id} value={params.value} />
		),
		renderHeader: () => <DetailPanelHeader />,
	},
	{
		field: "agencyCode",
		headerName: i18n.t("agency.code"),
		flex: 0.3,
		editable: false,
		filterable: true,
		sortable: true,
		valueGetter: (value: any, row: { agency: { code: string } }) =>
			row?.agency?.code ?? "-",
	},
	{
		field: "id",
		headerName: i18n.t("requesting.item_id"),
		minWidth: 50,
		flex: 0.3,
		editable: false,
		filterable: true,
		sortable: true,
	},
	{
		field: "status",
		headerName: i18n.t("ui.common.status"),
		minWidth: 100,
		editable: false,
		filterable: true,
		sortable: true,
		flex: 0.4,
		valueGetter: (value: any, row: { status: { code: string } }) =>
			row?.status?.code,
	},
	{
		field: "isRequestable",
		headerName: i18n.t("requesting.requestable"),
		minWidth: 50,
		type: "boolean",
		editable: false,
		filterable: true,
		sortable: true,
		flex: 0.3,
	},
	{
		field: "isSuppressed",
		headerName: i18n.t("requesting.suppressed"),
		minWidth: 50,
		type: "boolean",
		editable: false,
		filterable: true,
		sortable: true,
		flex: 0.3,
	},
	{
		field: "holdCount",
		headerName: i18n.t("requesting.hold_count"),
		minWidth: 50,
		type: "number",
		editable: false,
		filterable: true,
		sortable: true,
		flex: 0.3,
	},
	{
		field: "dueDate",
		headerName: i18n.t("requesting.date_due"),
		minWidth: 100,
		flex: 0.4,
		editable: false,
		filterable: true,
		sortable: true,
		// A Date, so the column sorts and filters by date: as text "3 Jan" sorted before "22 Sept"
		type: "date",
		valueGetter: (_value: unknown, row: { dueDate: string | null }) =>
			row?.dueDate ? new Date(row.dueDate) : null,
		valueFormatter: (value: Date | null) => (value ? formatDate(value) : "-"),
	},
	{
		field: "availabilityDate",
		headerName: i18n.t("requesting.date_available"),
		minWidth: 100,
		flex: 0.4,
		editable: false,
		filterable: true,
		sortable: true,
		type: "date",
		valueGetter: (_value: unknown, row: { availabilityDate: string | null }) =>
			row?.availabilityDate ? new Date(row.availabilityDate) : null,
		valueFormatter: (value: Date | null) => (value ? formatDate(value) : "-"),
	},
	{
		field: "canonicalItemType",
		headerName: i18n.t("requesting.supplier_type"),
		minWidth: 100,
		editable: false,
		filterable: true,
		sortable: true,
		flex: 0.5,
	},
];
