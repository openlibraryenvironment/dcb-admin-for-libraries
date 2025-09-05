import { CQL_FIELD_MAPPING } from "@constants/search/cqlMappings";
import { LANGUAGE_OPTIONS } from "@constants/search/languageOptions";
import {
	BooleanOperator,
	SearchField,
	SearchFilter,
} from "@models/SearchTypes";

// It would be nice to integrate this with buildFilterQuery for non search data grids
// But for now best to keep them separate
// This handles the building of the server-side query for DCB Locate searches.
// Defaults to CQL at present, but brings in Lucene where helpful. Mid-term goal is to get to the point where we can standardise to 1

export const buildQuery = (filters: SearchFilter[]): string => {
	if (filters.length === 0) return ""; // No filters, no query

	const hasLuceneOnlyFilter = filters.some(
		(f) => f.field === SearchField.PublicationYear && f.value
	); // There are some filters we need Lucene for. This is to track those

	if (filters.length == 1 && filters[0].field == SearchField.ClusterRecordID) {
		return filters[0].value;
	}

	const queryType: "cql" | "lucene" = hasLuceneOnlyFilter ? "lucene" : "cql";

	const queryParts: string[] = [];

	filters.forEach((filter, index) => {
		const fieldMapping = CQL_FIELD_MAPPING[filter.field];
		let value = filter.value;

		// Language field needs special handling
		// Translate the drop-down to something the server will understand.
		// And bear in mind that there could be multiple server values for one language.
		if (filter.field === SearchField.Language) {
			const languageOption = LANGUAGE_OPTIONS.find(
				(opt) => opt.label === value
			);
			value = languageOption?.value || value;
		}
		let fieldQuery = "";

		// Build field query based on query type - CQL is current default, but some can only be parsed with Lucene
		// The aim is to standardise around one
		if (queryType === "lucene") {
			fieldQuery = buildLuceneFieldQuery(filter.field, value);
		} else {
			fieldQuery = `(${fieldMapping} ${value})`;
		}

		// Handle our Boolean operators for chained filters. AND, OR, NOT currently supported.
		if (index > 0 && filter.operator) {
			switch (filter.operator) {
				case BooleanOperator.AND:
					queryParts.push(" AND ");
					break;
				case BooleanOperator.OR:
					queryParts.push(" OR ");
					break;
				case BooleanOperator.NOT:
					queryParts.push(" NOT ");
					break;
			}
		}

		queryParts.push(fieldQuery);
	});

	return queryParts.join("");
};

const buildLuceneFieldQuery = (field: SearchField, value: string): string => {
	// Map CQL fields to Lucene equivalents - see InstanceDocument in dcb-locate
	// And see CQLInterpreter in dcb-locate for CQL reference
	// WIP
	const luceneFieldMap = {
		[SearchField.Keyword]: "keyword",
		[SearchField.Title]: "title",
		[SearchField.Author]: "contributors",
		[SearchField.ISSN]: "issn",
		[SearchField.ISBN]: "isbn",
		[SearchField.Subject]: "subjects",
		[SearchField.Language]: "languages",
		[SearchField.Format]: "sourceTypes",
		[SearchField.PublicationYear]: "dateOfPublication",
		[SearchField.Publisher]: "instancePublishers",
		[SearchField.Library]: "items.effectiveLocationId",
		[SearchField.ClusterRecordID]: "",
	};

	const luceneField = luceneFieldMap[field];

	// Special handling for publication year ranges
	if (field === SearchField.PublicationYear) {
		return buildYearRangeQuery(value);
	}

	// Standard Lucene field query
	return `${luceneField}:"${value}"`;
};

const buildYearRangeQuery = (value: string): string => {
	// Handle various year range formats
	// Examples: "2020", "2020-2025", "2020-", "-2025"

	if (value.includes("-")) {
		const [startYear, endYear] = value.split("-").map((y) => y.trim());

		if (startYear && endYear) {
			// Range: 2020-2025
			return `dateOfPublication:[${startYear} TO ${endYear}]`;
		} else if (startYear && !endYear) {
			// From year onwards: 2020-
			return `dateOfPublication:[${startYear} TO *]`;
		} else if (!startYear && endYear) {
			// Up to year: -2025
			return `dateOfPublication:[* TO ${endYear}]`;
		}
	}

	// Single year
	return `dateOfPublication:"${value}"`;
};
