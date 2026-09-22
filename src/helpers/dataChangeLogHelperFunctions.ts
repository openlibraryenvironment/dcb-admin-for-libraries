import { splitOnCapitals } from "./splitOnCapitals";

export function calculateEntityLink(entityType: string) {
	// Basically a translator for table names to DCB Admin references.
	// Primarily intended for translating table names to links.
	switch (entityType) {
		case "agency":
			return "agencies";
		case "library":
			return "libraries";
		case "host_lms":
			return "hostlmss";
		case "library_group":
			return "groups";
		case "location":
			return "locations";
		case "patron_request":
			return "patronRequests";
		case "reference_value_mapping":
			return "mappings/allReferenceValue";
		case "numeric_range_mapping":
			return "mappings/allNumericRange";
		case "bib_record":
			return "bibs";
	}
}

export function tableNameToEntityName(entityType: string) {
	switch (entityType) {
		case "agency":
			return "agencies.agencies_one";
		case "consortium":
			return "nav.consortium.name";
		case "functional_setting":
			return "consortium.settings.one";
		case "library":
			return "libraries.library";
		case "host_lms":
			return "hostlms_one";
		case "library_contact":
			return "libraries.contacts.entity_name";
		case "library_group":
			return "groups.groups_one";
		case "library_group_member":
			return "groups.group_member";
		case "location":
			return "locations.location_one";
		case "patron_request":
			return "patron_requests.pr_one";
		case "reference_value_mapping":
			return "mappings.ref_value_one";
		case "numeric_range_mapping":
			return "mappings.num_range_one";
		case "bib_record":
			return "bibRecords.bib_one";
		default:
			// If no match, return the original string or a default value
			return entityType;
	}
}

/**
 * Acronyms the split cannot infer. Matched case-insensitively against each
 * word, so `id` and `Id` both reach `ID`.
 */
const ACRONYMS: Record<string, string> = {
	id: "ID",
	idp: "IDP",
	url: "URL",
	api: "API",
	lms: "LMS",
};

/**
 * Sentence case, applied PER WORD so an acronym survives it. lodash
 * `capitalize` is `upperFirst(toLower(s))`, which lower-cased the whole label
 * after the substitution above and made ACRONYMS dead code.
 */
const toLabel = (words: string[]): string => {
	const label = words
		.map((word) => ACRONYMS[word.toLowerCase()] ?? word.toLowerCase())
		.join(" ");
	return label.charAt(0).toUpperCase() + label.slice(1);
};

/** A snake_case column name as a person reads it. */
export function fieldNameToLabel(fieldName: string): string {
	return toLabel(fieldName.split("_"));
}

/** A camelCase grid field as a person reads it. */
export function gridFieldNameToLabel(fieldName: string): string {
	return toLabel(splitOnCapitals(fieldName));
}
