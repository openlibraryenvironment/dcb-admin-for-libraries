import { auditColumns } from "@helpers/dataGrid/columns/auditColumns";
import { standardBibColumns } from "@helpers/dataGrid/columns/bibColumns";
import { defaultLocationColumns } from "@helpers/dataGrid/columns/locationColumns";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { standardRefValueMappingColumns } from "@helpers/dataGrid/columns/referenceValueMappingColumns";
import { standardSupplierRequestColumns } from "@helpers/dataGrid/columns/supplierRequestColumns";
import { standardBibColumnVisibility } from "@helpers/dataGrid/columnVisibility/bibColumnVisbility";
import { standardLocationsColumnVisibility } from "@helpers/dataGrid/columnVisibility/locationColumnVisibility";
import { defaultPatronRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/patronRequestColumnVisibility";
import { referenceValueMappingColumnVisibility } from "@helpers/dataGrid/columnVisibility/referenceValueMappingColumnVisibilityModel";
import { defaultSupplierRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/supplierRequestColumnVisibility";
import { defineGrid } from "@helpers/dataGrid/gridSearch";

// The ids predate the URL: they key each grid's persisted column visibility.

export const patronRequestsGrid = defineGrid({
	id: "mainPatronRequests",
	searchKey: null,
	columns: standardPatronRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: defaultPatronRequestColumnVisibility,
});

export const supplierRequestsGrid = defineGrid({
	id: "supplierPatronRequests",
	searchKey: null,
	columns: standardSupplierRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: defaultSupplierRequestColumnVisibility,
});

export const mappingsGrid = defineGrid({
	id: "referenceValueMappings",
	searchKey: null,
	columns: standardRefValueMappingColumns,
	defaultSort: [{ field: "lastImported", sort: "desc" }],
	defaultColumnVisibility: referenceValueMappingColumnVisibility,
});

export const locationsGrid = defineGrid({
	id: "locations",
	searchKey: null,
	columns: defaultLocationColumns,
	defaultSort: [{ field: "lastImported", sort: "desc" }],
	defaultColumnVisibility: standardLocationsColumnVisibility,
});

export const bibsGrid = defineGrid({
	id: "bibs",
	searchKey: null,
	columns: standardBibColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: standardBibColumnVisibility,
});

/** One id for every record: the record is in the path, not the grid. */
export const recordHistoryGrid = defineGrid({
	id: "requestingHistory",
	searchKey: null,
	columns: standardPatronRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultPageSize: 100,
	defaultColumnVisibility: defaultPatronRequestColumnVisibility,
});

/** A tab of the request page, so namespaced under one key of that route's search. */
export const auditLogGrid = defineGrid({
	id: "patronRequestAuditLog",
	searchKey: "audit",
	columns: auditColumns,
	defaultSort: [{ field: "auditDate", sort: "desc" }],
	defaultColumnVisibility: {},
});
