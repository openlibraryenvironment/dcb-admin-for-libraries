// Map for quick filter (search) values for different types of data grid
// i.e. these are the attributes the quick filter searches by for each type of grid
export const quickFieldMap: Record<string, string> = {
	bibs: "sourceRecordId",
	patronRequests: "errorMessage",
	patronRequestsLibraryException: "errorMessage",
	patronRequestsLibraryOutOfSequence: "status",
	patronRequestsLibraryActive: "status",
	patronRequestsLibraryCompleted: "status",
	patronRequestsActive: "status",
	patronRequestsOutOfSequence: "status",
	patronRequestsCompleted: "status",
	patronRequestsException: "errorMessage",
	circulationStatus: "fromContext",
	referenceValueMappings: "fromCategory",
	referenceValueMappingsForLibraryPatron: "fromCategory",
	referenceValueMappingsForLibraryPatronSecondHostLms: "fromCategory",
	referenceValueMappingsForLibraryLocation: "fromCategory",
	referenceValueMappingsForLibraryLocationSecondHostLMS: "fromCategory",
	referenceValueMappingsForLibraryItemType: "fromCategory",
	referenceValueMappingsForLibraryItemTypeSecondHostLms: "fromCategory",
	numericRangeMappings: "domain",
	numericRangeMappingsForLibraryPatron: "domain",
	numericRangeMappingsForLibraryPatronSecondHostLms: "domain",
	numericRangeMappingsForLibraryItemTypeSecondHostLms: "domain",
	numericRangeMappingsForLibraryItemType: "domain",
	libraries: "fullName",
	welcomeLibraries: "fullName",
	agencies: "name",
	groups: "name",
	hostlmss: "name",
	locations: "name",
	libraryLocations: "name",
	dataChangeLog: "actionInfo",
	supplierRequestsLibrary: "status",
	default: "id",
};

// The fields where we need to apply conversion before sending a query.
// For example, the filter input for "elapsed time in current status" is in days.
// But it is stored on the server in seconds.
export const conversionFields = ["elapsedTimeInCurrentStatus"];
// Conversion field and conversion factor
export const conversionFieldsMap: Record<string, number> = {
	elapsedTimeInCurrentStatus: 86400,
};

export const numericOperators = [">=", ">", "<=", "<", "=", "!="];
