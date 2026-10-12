import { currentClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { CustomLink } from "@components/CustomLink";
import { detailLinkCell } from "@helpers/dataGrid/detailLinkCell";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";
import { standardFilters } from "@constants/filters/filters";
import { dcbStatusValueOptions } from "@constants/statuses/DCBStatuses";
import { GridColDef } from "@mui/x-data-grid-premium";
import i18n from "@/i18n";

// Filtered by the server: each column offers only operators buildFilterQuery can send.
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
		type: "dateTime",
		filterOperators: dateTimeRangeOperators,
		valueGetter: (value: string, row: { auditDate: string }) =>
			row.auditDate ? new Date(row.auditDate) : null,
		valueFormatter: (value: Date | null) =>
			formatTimestamp(value, currentClock(), { precise: true }),
	},
	{
		field: "briefDescription",
		headerName: i18n.t("audit.description"),
		minWidth: 100,
		flex: 0.4,
		filterOperators: standardFilters,
	},
	{
		field: "fromStatus",
		headerName: i18n.t("audit.from_status"),
		minWidth: 50,
		flex: 0.25,
		type: "singleSelect",
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "toStatus",
		headerName: i18n.t("audit.to_status"),
		minWidth: 50,
		flex: 0.25,
		type: "singleSelect",
		valueOptions: dcbStatusValueOptions,
	},
];
