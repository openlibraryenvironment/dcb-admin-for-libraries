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
import { defineGrid } from "@helpers/viewState/defineGrid";
import {
	auditLogView,
	bibsView,
	locationsView,
	mappingsView,
	patronRequestsView,
	pickupRequestsView,
	recordHistoryView,
	supplierRequestsView,
} from "@helpers/viewState/gridViewIds";

export const patronRequestsGrid = defineGrid(patronRequestsView, {
	columns: standardPatronRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: defaultPatronRequestColumnVisibility,
});

export const supplierRequestsGrid = defineGrid(supplierRequestsView, {
	columns: standardSupplierRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: defaultSupplierRequestColumnVisibility,
});

export const pickupRequestsGrid = defineGrid(pickupRequestsView, {
	columns: standardPatronRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultColumnVisibility: defaultPatronRequestColumnVisibility,
});

export const mappingsGrid = defineGrid(mappingsView, {
	columns: standardRefValueMappingColumns,
	defaultSort: [{ field: "lastImported", sort: "desc" }],
	defaultColumnVisibility: referenceValueMappingColumnVisibility,
});

export const locationsGrid = defineGrid(locationsView, {
	columns: defaultLocationColumns,
	defaultSort: [{ field: "name", sort: "asc" }],
	defaultColumnVisibility: standardLocationsColumnVisibility,
});

export const bibsGrid = defineGrid(bibsView, {
	columns: standardBibColumns,
	// No bib column sorts, and dcb-service ignores the order for bibs
	defaultSort: [],
	defaultColumnVisibility: standardBibColumnVisibility,
});

export const recordHistoryGrid = defineGrid(recordHistoryView, {
	columns: standardPatronRequestColumns,
	defaultSort: [{ field: "dateCreated", sort: "desc" }],
	defaultPageSize: 100,
	defaultColumnVisibility: defaultPatronRequestColumnVisibility,
});

export const auditLogGrid = defineGrid(auditLogView, {
	columns: auditColumns,
	defaultSort: [{ field: "auditDate", sort: "desc" }],
	defaultColumnVisibility: {},
});
