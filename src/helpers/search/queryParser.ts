import {
	BooleanOperator,
	SearchField,
	SearchFilter,
} from "@models/SearchTypes";
import { CQL_FIELD_MAPPING } from "@constants/search/cqlMappings";
import { validate } from "uuid";

const OPERATOR = /\s+(AND|OR|NOT)\s+/y;

/**
 * Splits on AND / OR / NOT between clauses, never inside a quoted value: a
 * title of "War AND Peace" is one clause. Values are written by
 * JSON.stringify, so a quote inside one is backslash-escaped.
 */
const splitClauses = (query: string): string[] => {
	const parts: string[] = [];
	let start = 0;
	let inQuote = false;

	for (let i = 0; i < query.length; i += 1) {
		const c = query[i];
		if (inQuote) {
			if (c === "\\") i += 1;
			else if (c === '"') inQuote = false;
			continue;
		}
		if (c === '"') {
			inQuote = true;
			continue;
		}
		OPERATOR.lastIndex = i;
		const match = OPERATOR.exec(query);
		if (match) {
			parts.push(query.slice(start, i), match[1]);
			start = i + match[0].length;
			i = start - 1;
		}
	}
	parts.push(query.slice(start));
	return parts;
};

export const parseQuery = (query: string): SearchFilter[] => {
	if (!query) return [];

	const parts = splitClauses(query);
	const filters: SearchFilter[] = [];
	let operator: BooleanOperator | undefined = undefined;
	const mappings = Object.entries(CQL_FIELD_MAPPING);

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i].trim();

		if (["AND", "OR", "NOT"].includes(part)) {
			operator = part as BooleanOperator;
			continue;
		}
		const innerContent =
			part.startsWith("(") && part.endsWith(")")
				? part.slice(1, -1).trim()
				: part.trim();
		// The cluster record ID maps to "", which every clause starts with, so it is
		// last in the mapping and only matches what nothing else did.
		for (const [searchField, cqlString] of mappings) {
			if (innerContent.startsWith(cqlString)) {
				const rawValue = innerContent.substring(cqlString.length).trim();
				let cleanValue = rawValue;
				if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
					try {
						cleanValue = JSON.parse(rawValue);
					} catch {
						cleanValue = rawValue.slice(1, -1);
					}
				}
				if (cleanValue) {
					// Text that is neither a known clause nor a UUID was typed into the
					// URL by hand; it is searched as a keyword, not looked up as an ID.
					const field =
						searchField === SearchField.ClusterRecordID && !validate(cleanValue)
							? SearchField.Keyword
							: (searchField as SearchField);
					filters.push({
						id: Date.now().toString() + i,
						field,
						value: cleanValue,
						...(operator && { operator }),
					});
					operator = undefined;
					break;
				}
			}
		}
	}

	return filters;
};
