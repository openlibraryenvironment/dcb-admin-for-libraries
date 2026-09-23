import { currentClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { CustomLink } from "@components/CustomLink";
import { detailLinkCell } from "@helpers/dataGrid/detailLinkCell";
import { GridColDef } from "@mui/x-data-grid-premium";
import i18n from "@/i18n";

export const auditColumns: GridColDef[] = [
	{
		// The row's handle: the leading cell is the link to this row's detail
		// page, so the grid is navigable without a pointer.
		renderCell: (params) =>
			detailLinkCell(params, (id, label) => (
				<CustomLink to="/patronRequests/audits/$auditId" params={{ auditId: id }}>
					{label}
				</CustomLink>
			)),
		field: "auditDate",
		headerName: i18n.t("audit.date"),
		minWidth: 60,
		flex: 0.2,
		editable: false,
		filterable: true,
		sortable: true,
		valueGetter: (value: string, row: { auditDate: string }) => {
			const auditDate = row.auditDate;
			return formatTimestamp(auditDate, currentClock(), { precise: true });
		},
	},
	{
		field: "briefDescription",
		headerName: i18n.t("audit.description"),
		minWidth: 100,
		flex: 0.4,
	},
	{
		field: "fromStatus",
		headerName: i18n.t("audit.from_status"),
		minWidth: 50,
		flex: 0.25,
	},
	{
		field: "toStatus",
		headerName: i18n.t("audit.to_status"),
		minWidth: 50,
		flex: 0.25,
	},
];
