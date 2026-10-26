// What a grid route's options need to know of its grid. Route files load eagerly, so nothing
// here may import MUI X or a column definition. docs/url-view-state.md, "Adding a grid".

export interface GridViewId {
	/** Keys the grid's remembered view, its saved filters and its history-state entries. */
	id: string;
	/** A second grid on a page prefixes its parameters with this: `audit.filters`. */
	namespace?: string;
	/** Whether a bare URL opens the reader's last view of this grid. */
	remember: boolean;
}

// The ids predate the URL: they key each grid's saved filters.

export const patronRequestsView: GridViewId = { id: "mainPatronRequests", remember: true };

export const supplierRequestsView: GridViewId = { id: "supplierPatronRequests", remember: true };

export const pickupRequestsView: GridViewId = { id: "pickupPatronRequests", remember: true };

export const mappingsView: GridViewId = { id: "referenceValueMappings", remember: true };

export const locationsView: GridViewId = { id: "locations", remember: true };

export const bibsView: GridViewId = { id: "bibs", remember: true };

/** One record's requesting history: transient, and the record is in the path. */
export const recordHistoryView: GridViewId = { id: "requestingHistory", remember: false };

/** A tab of the request page, under its own namespace. One request's log is not remembered. */
export const auditLogView: GridViewId = {
	id: "patronRequestAuditLog",
	namespace: "audit",
	remember: false,
};
