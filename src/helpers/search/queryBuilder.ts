import { validate } from "uuid";
import { CQL_FIELD_MAPPING } from "@constants/search/cqlMappings";
import {
	BooleanOperator,
	SearchField,
	SearchFilter,
} from "@models/SearchTypes";

/**
 * The search request's query: CQL, or Lucene where a filter needs it. A cluster
 * record ID is looked up on its own rather than searched, so it must be a UUID:
 * anything else would reach the search engine as raw query syntax.
 */
export const buildQuery = (filters: SearchFilter[]): string => {
	if (filters.length === 0) return ""; // No filters, no query

	const hasLuceneOnlyFilter = filters.some(
		(f) => f.field === SearchField.PublicationYear && f.value,
	); // There are some filters we need Lucene for. This is to track those

	if (filters.some((filter) => filter.field === SearchField.ClusterRecordID)) {
		const id = filters[0].value.trim();
		return filters.length === 1 && validate(id) ? id : "";
	}

	const queryType: "cql" | "lucene" = hasLuceneOnlyFilter ? "lucene" : "cql";

	const queryParts: string[] = [];

	filters.forEach((filter, index) => {
		const fieldMapping = CQL_FIELD_MAPPING[filter.field];
		const value = filter.value;

		const safelyQuotedValue = JSON.stringify(value);
		let fieldQuery = "";

		// Build field query based on query type - CQL is current default, but some can only be parsed with Lucene
		// The aim is to standardise around one
		if (queryType === "lucene") {
			fieldQuery = buildLuceneFieldQuery(filter.field, value);
		} else {
			fieldQuery =
				fieldMapping == CQL_FIELD_MAPPING.isbn
					? `${fieldMapping} ${safelyQuotedValue}`
					: `(${fieldMapping} ${safelyQuotedValue})`;
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
