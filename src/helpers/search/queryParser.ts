import {
	BooleanOperator,
	SearchField,
	SearchFilter,
} from "@models/SearchTypes";
import { CQL_FIELD_MAPPING } from "@constants/search/cqlMappings";

export const parseQuery = (query: string): SearchFilter[] => {
	if (!query) return [];

	const parts = query.split(/\s+(AND|OR|NOT)\s+/);
	const filters: SearchFilter[] = [];
	let operator: BooleanOperator | undefined = undefined;

	// Get the mappings as an array of [SearchField, string] to iterate over
	const mappings = Object.entries(CQL_FIELD_MAPPING);

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i].trim();

		if (["AND", "OR", "NOT"].includes(part)) {
			operator = part as BooleanOperator;
			continue;
		}

		// Remove the outer parentheses to get the content
		const innerContent =
			part.startsWith("(") && part.endsWith(")")
				? part.slice(1, -1).trim()
				: part.trim();

		// Find which mapping matches the start of the filter content
		for (const [searchField, cqlString] of mappings) {
			if (innerContent.startsWith(cqlString)) {
				// The value is whatever comes after the mapping string
				const value = innerContent.substring(cqlString.length).trim();

				// Ensure a value exists before creating the filter
				if (value) {
					filters.push({
						id: Date.now().toString() + i,
						field: searchField as SearchField,
						value: value,
						...(operator && { operator }),
					});
					operator = undefined; // Reset operator after use
					break; // Move to the next part of the URL query
				}
			}
		}
	}

	return filters;
};
