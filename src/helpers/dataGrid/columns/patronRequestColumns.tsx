import i18n from "@/i18n";
import { CustomLink } from "@components/CustomLink";
import { detailLinkCell } from "@helpers/dataGrid/detailLinkCell";
import { dateTimeRangeOperators } from "@constants/filters/dateTimeRangeOperators";
import {
	containsOnly,
	durationFilters,
	equalsOnly,
	isOnly,
	standardFilters,
} from "@constants/filters/filters";
import { dcbStatusValueOptions } from "@constants/statuses/DCBStatuses";
import { dcbWorkflowOptions } from "@constants/workflows/DCBWorkflows";
import { formatDuration } from "@helpers/formatDuration";
import { PatronRequest } from "@models/PatronRequest";
import { GridColDef } from "@mui/x-data-grid-premium";
import dayjs from "dayjs";

// Lots of translation keys needed
export const standardPatronRequestColumns: GridColDef[] = [
	{
		// The row's handle: the leading cell is the link to this row's detail
		// page, so the grid is navigable without a pointer.
		renderCell: (params) =>
			detailLinkCell(params, (id, label) => (
				<CustomLink to="/patronRequests/$id" params={{ id: id }}>
					{label}
				</CustomLink>
			)),
		field: "dateCreated",
		headerName: i18n.t("grid.headers.request_created"),
		minWidth: 150,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { dateCreated: string }) => {
			return row.dateCreated ? new Date(row.dateCreated) : null;
		},
		valueFormatter: (value: Date) => {
			return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "";
		},
	},
	{
		field: "patronBarcode",
		headerName: i18n.t("grid.headers.patron_barcode"),
		filterable: true,
		sortable: false,
		filterOperators: equalsOnly,
		flex: 0.75,
		valueGetter: (value: string, row: PatronRequest) =>
			row?.requestingIdentity?.localBarcode,
	},
	{
		field: "clusterRecordTitle",
		headerName: i18n.t("grid.headers.title"),
		minWidth: 100,
		flex: 1.5,
		filterable: false, // Cannot currently filter on nested properties.
		sortable: false,
		valueGetter: (value: string, row: { clusterRecord: { title: string } }) =>
			row?.clusterRecord?.title,
	},
	{
		field: "supplyingAgencyCode",
		headerName: i18n.t("grid.headers.supplying_library"),
		filterable: true,
		sortable: false,
		flex: 1,
		type: "singleSelect",
		filterOperators: isOnly,
		valueGetter: (value: string, row: PatronRequest) => {
			// Check if suppliers array is not empty
			if (row.suppliers.length > 0) {
				return row.suppliers[0].localAgency;
			} else {
				return ""; // This allows us to handle the array being empty, and any related type errors.
			}
		},
	},
	{
		field: "pickupRequestId",
		headerName: i18n.t("grid.headers.pickup_request_uuid"),
		minWidth: 100,
		sortable: true,
		filterable: false,
	},
	{
		field: "pickupRequestStatus",
		headerName: i18n.t("grid.headers.pickup_request_status"),
		minWidth: 100,
		sortable: true, // Maybe this shouldn't be filterable. one to check
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "canonicalPtype",
		headerName: i18n.t("grid.headers.dcb_canonical_patron_type"),
		minWidth: 100,
		flex: 0.5,
		filterable: false,
		sortable: false,
		valueGetter: (value: string, row: PatronRequest) => {
			const requestingIdentity = row?.requestingIdentity;
			return requestingIdentity?.canonicalPtype ?? "";
		},
	},
	{
		field: "canonicalItemType",
		headerName: i18n.t("grid.headers.dcb_canonical_item_type"),
		minWidth: 100,
		flex: 0.5,
		filterable: false,
		sortable: false,
		valueGetter: (
			value: string,
			row: { suppliers: { canonicalItemType: string }[] },
		) => {
			if (row.suppliers.length > 0) {
				return row.suppliers[0].canonicalItemType;
			} else {
				return ""; // This allows us to handle the array being empty, and any related type errors.
			}
		},
	},
	{
		field: "previousStatus",
		headerName: i18n.t("grid.headers.previous_status"),
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "status",
		headerName: i18n.t("grid.headers.status"),
		minWidth: 100,
		flex: 1.0,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "nextExpectedStatus",
		headerName: i18n.t("grid.headers.next_status"),
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "errorMessage",
		headerName: i18n.t("grid.headers.error_message"),
		minWidth: 100,
		flex: 1.5,
		filterOperators: containsOnly, // Should probably still be free text
	},
	{
		field: "outOfSequenceFlag",
		headerName: i18n.t("grid.headers.out_of_sequence"), // Should be true/false
		flex: 0.75,
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "pollCountForCurrentStatus",
		headerName: i18n.t("grid.headers.polling_count"),
		flex: 0.75,
		filterOperators: equalsOnly, // Should be numeric
		type: "number",
	},
	{
		field: "elapsedTimeInCurrentStatus",
		headerName: i18n.t("grid.headers.time_in_state_days"),
		description:
			"The time the request has been in its current status, in the format dd:hh:mm:ss", // Can we replicate this elsewhere?
		minWidth: 50,
		type: "number",
		filterOperators: durationFilters,
		valueGetter: (
			value: string,
			row: { elapsedTimeInCurrentStatus: number },
		) => {
			return formatDuration(row.elapsedTimeInCurrentStatus);
		},
	},
	{
		field: "isManuallySelectedItem",
		headerName: i18n.t("grid.headers.manually_selected"),
		flex: 0.75, // true false
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "dateUpdated",
		headerName: i18n.t("grid.headers.request_updated"),
		minWidth: 150,
		filterOperators: dateTimeRangeOperators,
		type: "dateTime",
		valueGetter: (value: any, row: { dateUpdated: string }) => {
			return row.dateUpdated ? new Date(row.dateUpdated) : null;
		},
		valueFormatter: (value: Date) => {
			return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "";
		},
	},
	{
		field: "description",
		headerName: i18n.t("grid.headers.description"), // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "requesterNote",
		headerName: i18n.t("grid.headers.requester_note"), // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "id",
		headerName: i18n.t("grid.headers.request_uuid"), // free text
		minWidth: 100,
		flex: 0.5,
		filterOperators: equalsOnly,
	},
	{
		field: "activeWorkflow",
		headerName: i18n.t("grid.headers.active_workflow"), // should have options
		minWidth: 100,
		sortable: true,
		filterable: true,
		type: "singleSelect",
		valueOptions: dcbWorkflowOptions,
		filterOperators: isOnly,
	},
	{
		field: "isExpeditedCheckout",
		headerName: i18n.t("grid.headers.walk_up_request"), // true false
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
		type: "boolean",
	},
	{
		field: "renewalCount",
		headerName: i18n.t("grid.headers.renewal_count"),
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Item values
	{
		field: "itemBarcode",
		headerName: i18n.t("grid.headers.item_barcode"),
		filterable: false,
		sortable: false,
		flex: 0.3,
		valueGetter: (value: any, row: PatronRequest) => {
			if (row.suppliers.length > 0) {
				return row.suppliers[0].localItemBarcode;
			} else {
				return "";
			}
		},
	},
	{
		field: "localItemStatus",
		headerName: i18n.t("grid.headers.local_item_status"),
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalItemStatus",
		headerName: i18n.t("grid.headers.raw_local_item_status"),
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemType",
		headerName: i18n.t("grid.headers.local_item_type"),
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemId",
		headerName: i18n.t("grid.headers.local_item_id"),
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Local requests
	{
		field: "localRequestStatus",
		headerName: i18n.t("grid.headers.local_request_status"),
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalRequestStatus",
		headerName: i18n.t("grid.headers.raw_local_request_status"),
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localRequestId",
		headerName: i18n.t("grid.headers.local_request_id"),
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
];
