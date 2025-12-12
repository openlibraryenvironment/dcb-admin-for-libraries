import dayjs from "dayjs";

import { formatDuration } from "../formatDuration";
import { PatronRequest } from "@models/PatronRequest";
import {
	GridColDef,
	GridColumnVisibilityModel,
} from "@mui/x-data-grid-premium";
import {
	containsOnly,
	durationFilters,
	equalsOnly,
	isOnly,
	standardFilters,
} from "@constants/filters/filters";
import { dcbStatusValueOptions } from "@constants/statuses/DCBStatuses";
import { dcbWorkflowOptions } from "@constants/workflows/DCBWorkflows";

// Handles standard columns so we don't have to re-declare them everywhere

export const standardRefValueMappingColumns: GridColDef[] = [
	{
		field: "fromCategory",
		headerName: "Category",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "fromContext",
		headerName: "From context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "fromValue",
		headerName: "From value",
		minWidth: 50,
		flex: 0.4,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "toContext",
		headerName: "To context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "toValue",
		headerName: "To value",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
		sortable: true,
		valueGetter: (value: string, row: { toValue: string }) => row?.toValue,
	},
	{
		field: "lastImported",
		headerName: "Last imported",
		minWidth: 100,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: false,
		sortable: true,
		valueGetter: (value: string, row: { lastImported: string }) => {
			const lastImported = row.lastImported;
			const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
			if (formattedDate == "Invalid Date") {
				return "";
			} else {
				return formattedDate;
			}
		},
	},
	{
		field: "toCategory",
		headerName: "To category",
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
		headerName: "Category",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: true,
		editable: false,
	},
	{
		field: "fromContext",
		headerName: "From context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "fromValue",
		headerName: "From value",
		minWidth: 50,
		flex: 0.4,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
	},
	{
		field: "toContext",
		headerName: "To context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
		sortable: false,
		editable: false,
	},
	{
		field: "toValue",
		headerName: "To value",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		sortable: true,
		editable: true,
		valueGetter: (value: string, row: { toValue: string }) => row?.toValue,
	},
	{
		field: "lastImported",
		headerName: "Last imported",
		minWidth: 100,
		flex: 0.5,
		filterOperators: standardFilters,
		sortable: true,
		editable: false,
		valueGetter: (value: string, row: { lastImported: string }) => {
			const lastImported = row.lastImported;
			const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
			if (formattedDate == "Invalid Date") {
				return "";
			} else {
				return formattedDate;
			}
		},
	},
	{
		field: "toCategory",
		headerName: "To category",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
		sortable: true,
		valueGetter: (value: string, row: { toCategory: string }) =>
			row?.toCategory,
	},
];

export const standardNumRangeMappingColumns: GridColDef[] = [
	{
		field: "domain",
		headerName: "Category",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "context",
		headerName: "From context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "lowerBound",
		headerName: "Lower bound",
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "upperBound",
		headerName: "Upper bound",
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "targetContext",
		headerName: "To context",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "mappedValue",
		headerName: "Mapped value",
		minWidth: 50,
		flex: 0.5,
		editable: true,
		filterOperators: standardFilters,
	},
	{
		field: "lastImported",
		headerName: "Last imported",
		minWidth: 100,
		flex: 0.5,
		filterOperators: standardFilters,
		valueGetter: (value: string, row: { lastImported: string }) => {
			const lastImported = row.lastImported;
			const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
			if (formattedDate == "Invalid Date") {
				return "";
			} else {
				return formattedDate;
			}
		},
	},
];

export const numRangeMappingColumnsNoCategoryFilter: GridColDef[] = [
	{
		field: "domain",
		headerName: "Category",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "context",
		headerName: "From context",
		minWidth: 50,
		flex: 0.5,
		filterable: false,
	},
	{
		field: "lowerBound",
		headerName: "Lower bound",
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "upperBound",
		headerName: "Upper bound",
		minWidth: 50,
		flex: 0.4,
		filterOperators: equalsOnly,
	},
	{
		field: "targetContext",
		headerName: "To context",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
	},
	{
		field: "mappedValue",
		headerName: "Mapped value",
		minWidth: 50,
		flex: 0.5,
		filterOperators: standardFilters,
		editable: true,
	},
	{
		field: "lastImported",
		headerName: "Last imported",
		minWidth: 100,
		flex: 0.5,
		filterOperators: standardFilters,
		valueGetter: (value: string, row: { lastImported: string }) => {
			const lastImported = row.lastImported;
			const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
			if (formattedDate == "Invalid Date") {
				return "";
			} else {
				return formattedDate;
			}
		},
	},
];

// We need to separate these columns for supplier and patron views

export const standardPatronRequestColumns: GridColDef[] = [
	{
		field: "dateCreated",
		headerName: "Request created",
		minWidth: 150,
		filterable: false,
		valueGetter: (value: string, row: { dateCreated: string }) => {
			const requestCreated = row.dateCreated;
			return dayjs(requestCreated).format("YYYY-MM-DD HH:mm");
		},
	},
	{
		field: "localBarcode",
		headerName: "Patron barcode",
		filterable: false,
		sortable: false,
		flex: 0.75,
		valueGetter: (value: string, row: PatronRequest) =>
			row?.requestingIdentity?.localBarcode,
	},
	{
		field: "clusterRecordTitle",
		headerName: "Title",
		minWidth: 100,
		flex: 1.5,
		filterable: false, // Cannot currently filter on nested properties.
		sortable: false,
		valueGetter: (value: string, row: { clusterRecord: { title: string } }) =>
			row?.clusterRecord?.title,
	},
	{
		field: "supplyingAgencyCode",
		headerName: "Supplying library",
		filterable: true,
		sortable: true,
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
		headerName: "Pickup request UUID",
		minWidth: 100,
		sortable: true,
		filterable: false,
	},
	{
		field: "pickupRequestStatus",
		headerName: "Pickup request status",
		minWidth: 100,
		sortable: true, // Maybe this shouldn't be filterable. one to check
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "canonicalPtype",
		headerName: "DCB canonical patron type",
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
		headerName: "DCB canonical item type",
		minWidth: 100,
		flex: 0.5,
		filterable: false,
		sortable: false,
		valueGetter: (
			value: string,
			row: { suppliers: { canonicalItemType: string }[] }
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
		headerName: "Previous status",
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "status",
		headerName: "Status",
		minWidth: 100,
		flex: 1.0,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "nextExpectedStatus",
		headerName: "Next status",
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "errorMessage",
		headerName: "Error message",
		minWidth: 100,
		flex: 1.5,
		filterOperators: containsOnly, // Should probably still be free text
	},
	{
		field: "outOfSequenceFlag",
		headerName: "Out of sequence", // Should be true/false
		flex: 0.75,
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "pollCountForCurrentStatus",
		headerName: "Polling count",
		flex: 0.75,
		filterOperators: equalsOnly, // Should be numeric
		type: "number",
	},
	{
		field: "elapsedTimeInCurrentStatus",
		headerName: "Time in state (days)",
		description:
			"The time the request has been in its current status, in the format dd:hh:mm:ss", // Can we replicate this elsewhere?
		minWidth: 50,
		type: "number",
		filterOperators: durationFilters,
		valueGetter: (
			value: string,
			row: { elapsedTimeInCurrentStatus: number }
		) => {
			return formatDuration(row.elapsedTimeInCurrentStatus);
		},
	},
	{
		field: "isManuallySelectedItem",
		headerName: "Manually selected?",
		flex: 0.75, // true false
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "dateUpdated",
		headerName: "Request updated",
		minWidth: 150, // date picker candidate
		filterable: false,
		valueGetter: (value: string, row: { dateUpdated: string }) => {
			const requestUpdated = row.dateUpdated;
			return dayjs(requestUpdated).format("YYYY-MM-DD HH:mm");
		},
	},
	{
		field: "description",
		headerName: "Description", // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "requesterNote",
		headerName: "Requester note", // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "id",
		headerName: "Request UUID", // free text
		minWidth: 100,
		flex: 0.5,
		filterOperators: equalsOnly,
	},
	{
		field: "activeWorkflow",
		headerName: "Active workflow", // should have options
		minWidth: 100,
		sortable: true,
		filterable: true,
		type: "singleSelect",
		valueOptions: dcbWorkflowOptions,
		filterOperators: isOnly,
	},
	{
		field: "isExpeditedCheckout",
		headerName: "Walk-up request?", // true false
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
		type: "boolean",
	},
	{
		field: "renewalCount",
		headerName: "Renewal count",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Item values
	{
		field: "itemBarcode",
		headerName: "Item barcode",
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
		headerName: "Local item status",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalItemStatus",
		headerName: "Raw local item status",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemType",
		headerName: "Local item type",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemId",
		headerName: "Local item ID",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Local requests
	{
		field: "localRequestStatus",
		headerName: "Local request status",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalRequestStatus",
		headerName: "Raw local request status",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localRequestId",
		headerName: "Local request ID",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
];

export const standardSupplierRequestColumns: GridColDef[] = [
	{
		field: "dateCreated",
		headerName: "Request created",
		minWidth: 150,
		filterable: false,
		valueGetter: (value: string, row: { dateCreated: string }) => {
			const requestCreated = row.dateCreated;
			return dayjs(requestCreated).format("YYYY-MM-DD HH:mm");
		},
	},
	{
		field: "patronHostlmsCode",
		headerName: "Patron library",
		filterable: true, // Should present library options but with the HOST LMS code as a mapping.
		sortable: false,
		type: "singleSelect",
		filterOperators: isOnly,
		flex: 1,
	},
	{
		field: "localBarcode",
		headerName: "Patron barcode",
		filterable: false,
		sortable: false,
		flex: 0.75,
		valueGetter: (value: string, row: PatronRequest) =>
			row?.requestingIdentity?.localBarcode,
	},
	{
		field: "clusterRecordTitle",
		headerName: "Title",
		minWidth: 100,
		flex: 1.5,
		filterable: false, // Cannot currently filter on nested properties.
		sortable: false,
		valueGetter: (value: string, row: { clusterRecord: { title: string } }) =>
			row?.clusterRecord?.title,
	},
	{
		field: "pickupRequestId",
		headerName: "Pickup request UUID",
		minWidth: 100,
		sortable: true,
		filterable: false,
	},
	{
		field: "pickupRequestStatus",
		headerName: "Pickup request status",
		minWidth: 100,
		sortable: true, // Maybe this shouldn't be filterable. one to check
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "canonicalPtype",
		headerName: "DCB canonical patron type",
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
		headerName: "DCB canonical item type",
		minWidth: 100,
		flex: 0.5,
		filterable: false,
		sortable: false,
		valueGetter: (
			value: string,
			row: { suppliers: { canonicalItemType: string }[] }
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
		headerName: "Previous status",
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "status",
		headerName: "Status",
		minWidth: 100,
		flex: 1.0,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "nextExpectedStatus",
		headerName: "Next status",
		minWidth: 100,
		flex: 1.5,
		type: "singleSelect", // Note - may need to support IS and IS NOT, but not is any of as we have a different way of doing that
		filterOperators: undefined,
		valueOptions: dcbStatusValueOptions,
	},
	{
		field: "errorMessage",
		headerName: "Error message",
		minWidth: 100,
		flex: 1.5,
		filterOperators: containsOnly, // Should probably still be free text
	},
	{
		field: "outOfSequenceFlag",
		headerName: "Out of sequence", // Should be true/false
		flex: 0.75,
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "pollCountForCurrentStatus",
		headerName: "Polling count",
		flex: 0.75,
		filterOperators: equalsOnly, // Should be numeric
		type: "number",
	},
	{
		field: "elapsedTimeInCurrentStatus",
		headerName: "Time in state (days)",
		description:
			"The time the request has been in its current status, in the format dd:hh:mm:ss", // Can we replicate this elsewhere?
		minWidth: 50,
		type: "number",
		filterOperators: durationFilters,
		valueGetter: (
			value: string,
			row: { elapsedTimeInCurrentStatus: number }
		) => {
			return formatDuration(row.elapsedTimeInCurrentStatus);
		},
	},
	{
		field: "isManuallySelectedItem",
		headerName: "Manually selected?",
		flex: 0.75, // true false
		filterOperators: equalsOnly,
		type: "boolean",
	},
	{
		field: "dateUpdated",
		headerName: "Request updated",
		minWidth: 150, // date picker candidate
		filterable: false,
		valueGetter: (value: string, row: { dateUpdated: string }) => {
			const requestUpdated = row.dateUpdated;
			return dayjs(requestUpdated).format("YYYY-MM-DD HH:mm");
		},
	},
	{
		field: "description",
		headerName: "Description", // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "requesterNote",
		headerName: "Requester note", // free text
		filterOperators: standardFilters,
		flex: 0.5,
	},
	{
		field: "id",
		headerName: "Request UUID", // free text
		minWidth: 100,
		flex: 0.5,
		filterOperators: equalsOnly,
	},
	{
		field: "activeWorkflow",
		headerName: "Active workflow", // should have options
		minWidth: 100,
		sortable: true,
		filterable: true,
		type: "singleSelect",
		valueOptions: dcbWorkflowOptions,
		filterOperators: isOnly,
	},
	{
		field: "isExpeditedCheckout",
		headerName: "Walk-up request?", // true false
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
		type: "boolean",
	},
	{
		field: "renewalCount",
		headerName: "Renewal count",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Item values
	{
		field: "itemBarcode",
		headerName: "Item barcode",
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
		headerName: "Local item status",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalItemStatus",
		headerName: "Raw local item status",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemType",
		headerName: "Local item type",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localItemId",
		headerName: "Local item ID",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	// Local requests
	{
		field: "localRequestStatus",
		headerName: "Local request status",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "rawLocalRequestStatus",
		headerName: "Raw local request status",
		flex: 0.5,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
	{
		field: "localRequestId",
		headerName: "Local request ID",
		flex: 0.3,
		filterOperators: equalsOnly,
		filterable: true,
		sortable: true,
	},
];

export const defaultSupplierRequestColumnVisibility: GridColumnVisibilityModel =
	{
		canonicalItemType: false,
		canonicalPtype: false,
		pickupLocationCode: false,
		patronHostlmsCode: true,
		previousStatus: false,
		nextExpectedStatus: false,
		errorMessage: false,
		outOfSequenceFlag: false,
		isManuallySelectedItem: false,
		dateUpdated: false,
		id: false,
		suppliers: false,
		supplyingAgencyCode: false,
		pickupRequestId: false,
		pickupRequestStatus: false,
		isExpeditedCheckout: false,
		description: false,
		requesterNote: false,
		pollCountForCurrentStatus: false,
		itemBarcode: false,
		localItemStatus: false,
		rawLocalItemStatus: false,
		localItemId: false,
		localItemType: false,
		localRequestStatus: false,
		rawLocalRequestStatus: false,
		localRequestId: false,
		renewalCount: false,
	};

export const defaultPatronRequestColumnVisibility: GridColumnVisibilityModel = {
	canonicalItemType: false,
	canonicalPtype: false,
	pickupLocationCode: false,
	patronHostlmsCode: false,
	previousStatus: false,
	nextExpectedStatus: false,
	errorMessage: false,
	outOfSequenceFlag: false,
	isManuallySelectedItem: false,
	dateUpdated: false,
	id: false,
	description: false,
	requesterNote: false,
	activeWorkflow: false,
	pickupRequestId: false,
	pickupRequestStatus: false,
	isExpeditedCheckout: false,
	itemBarcode: false,
	localItemStatus: false,
	rawLocalItemStatus: false,
	localItemId: false,
	localItemType: false,
	localRequestStatus: false,
	rawLocalRequestStatus: false,
	localRequestId: false,
	renewalCount: false,
};

export const standardLocationsColumnVisibility = {
	id: false,
	lastImported: false,
	localId: false,
	name: true,
	isPickup: true,
	isPickupAnywhere: true,
	code: true,
	hostSystemName: false,
	printLabel: false,
};
