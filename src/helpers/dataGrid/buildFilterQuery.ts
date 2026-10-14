import {
	conversionFields,
	conversionFieldsMap,
	numericOperators,
} from "@constants/dataGrid/fields";
import dayjs from "dayjs";

const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;

/**
 * A user's text as one Lucene term. Unescaped, `(`, `:`, `"` or `||` in a filter
 * either fails to parse - which the grid reports as "could not process" and
 * resets - or changes which records the query matches.
 */
export const escapeLucene = (value: string): string => {
	const escaped = value.replace(LUCENE_SPECIAL, "\\$&");
	// A bare operator word is a parse error, not a term
	return /^(AND|OR|NOT)$/.test(escaped) ? `\\${escaped}` : escaped;
};

/** Whitespace becomes the single-character wildcard, so a phrase - or a pasted tab - stays one term. */
export const asTerm = (value: unknown): string =>
	escapeLucene(String(value)).replace(/\s/g, "?");

export const buildFilterQuery = (
	field: string,
	operator: string,
	value: any
) => {
	// The order of this is very important. Last 30/90 days operators have no "value" so we must analyse them first
	// Or we'll get hit with the null value error.
	if (operator === "last30Days") {
		const end = dayjs().toISOString();
		const start = dayjs().subtract(30, "day").toISOString();

		return `${field}:[${start} TO ${end}]`;
	}

	if (operator === "last90Days") {
		const end = dayjs().toISOString();
		const start = dayjs().subtract(90, "day").toISOString();

		return `${field}:[${start} TO ${end}]`;
	}
	// 0 and false are values; nothing, an empty string and an empty list are not
	if (
		!field ||
		value === undefined ||
		value === null ||
		value === "" ||
		(Array.isArray(value) && value.length === 0)
	) {
		return null;
	}
	if (operator === "isAnyOf") {
		if (Array.isArray(value) && value.length > 0) {
			// Lucene syntax: field:("Val1" OR "Val2" OR "Val3")
			// We quote values to handle spaces/special chars safely
			const options = value
				.map((v) => `"${String(v).replace(/["\\]/g, "\\$&")}"`)
				.join(" OR ");
			return `${field}:(${options})`;
		}
		return null; // Empty array -> no filter
	}

	const fromValue = value[0];
	const toValue = value[1];
	const isConversionField = conversionFields.includes(field);
	const conversionFieldFactor = conversionFieldsMap[field];

	// Goes first because it needs to be handled before anything  else
	if (operator === "between" && value) {
		// At the minute we only need to handle numeric fields.
		// If the value isn't numeric we must remove spaces
		if (conversionFields.includes(field)) {
			const fromSeconds = fromValue * conversionFieldFactor;
			const toSeconds = toValue * conversionFieldFactor;
			// May not need all of this
			if (fromSeconds && toSeconds) {
				return `${field}:[${fromSeconds} TO ${toSeconds}]`;
			} else if (fromSeconds && !toSeconds) {
				return `${field}:[${fromSeconds} TO *]`;
			} else if (toSeconds && !fromSeconds) {
				return `${field}:[* TO ${toSeconds}]`;
			}
			return "";
		}
		// Not a conversion field
		else {
			if (fromValue && toValue) {
				return `${field}:[${fromValue} TO ${toValue}]`;
			} else if (fromValue && !toValue) {
				return `${field}:[${fromValue} TO *]`;
			} else if (toValue && !fromValue) {
				return `${field}:[* TO ${toValue}]`;
			}
			return "";
		}
	}
	// Date range handling
	// We want to handle is ON OR after, is on or before,range,
	// On or after - range with open bound (Date TO *)
	// On or before - range with open bound (Date TO *)
	// We should also handle "Today"
	if (operator === "luceneDateRange" && Array.isArray(value)) {
		const [start, end] = value;

		// We need to handle open bounds (*) and we also need to convert to UTC. But can't convert null to UTC so we must check
		// In the absence of a value, assume open bounds.
		// In the absence of both values, ignore input entirely.
		const startStr = start ? dayjs(start).toISOString() : "*";
		const endStr = end ? dayjs(end).toISOString() : "*";

		if (startStr === "*" && endStr === "*") return "";

		return `${field}:[${startStr} TO ${endStr}]`;
	}

	// Handle date-time "before" or "after" operations
	if (operator === "onOrAfter" || operator === "onOrBefore") {
		if (!value) return "";
		const dateStr = dayjs(value).toISOString();

		if (operator === "onOrAfter") {
			// Essentially this is just from X (inclusive) to now
			return `${field}:[${dateStr} TO *]`;
		}
		if (operator === "onOrBefore") {
			return `${field}:[* TO ${dateStr}]`;
		}
	}

	const replacedValue =
		numericOperators.includes(operator) && typeof value === "number"
			? value
			: asTerm(value);
	// Question marks are used to replace spaces in search terms- see Lucene docs https://lucene.apache.org/core/9_9_1/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package.description
	// Lucene powers our server-side querying so we need to get expressions into the right syntax.
	// We're currently only supporting contains and equals, but other operators are possible - see docs.
	// We will also need to introduce type handling - i.e. for UUIDs, numbers etc - based on the field.

	const convertedValue = Number(value) * conversionFieldFactor;
	const containsQuery = `${field}:*${replacedValue}*`;
	// Grouped, so an OR beside it cannot split it: `a OR *:* AND NOT b` parses as `+*:* -b a`
	const doesNotContainQuery = `(*:* AND NOT (${containsQuery}))`;
	const equalsQuery = isConversionField
		? `${field}:${convertedValue}`
		: `${field}:${replacedValue}`;
	const doesNotEqualQuery = `(*:* AND NOT (${equalsQuery}))`;
	const lessThanQueryInclusive = isConversionField
		? `${field}:[* TO ${convertedValue}]`
		: `${field}:[* TO ${replacedValue}]`;
	const lessThanQueryExclusive = isConversionField
		? `${field}:{* TO ${convertedValue}}`
		: `${field}:{* TO ${replacedValue}}`;
	const greaterThanQueryInclusive = isConversionField
		? `${field}:[${convertedValue} TO *]`
		: `${field}:[${replacedValue} TO *]`;
	const greaterThanQueryExclusive = isConversionField
		? `${field}:{${convertedValue} TO *}`
		: `${field}:{${replacedValue} TO *}`;

	switch (operator) {
		case "contains":
			return containsQuery;
		case "equals":
		case "=":
		case "is":
			return equalsQuery;
		case "does not equal":
		case "!=":
		case "Does not equal":
		case "is not":
		case "not": //See MUI X github for operators https://github.com/mui/mui-x/blob/9bda61c7fa7876b0f3cce60378fe3b560408e399/packages/x-data-grid/src/colDef/gridSingleSelectOperators.ts
			// Note - the NOT operator can not be used with just one term. So we have to improvise
			// https://lucene.apache.org/core/9_9_1/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#not-heading
			return doesNotEqualQuery;
		case "does not contain":
			return doesNotContainQuery;
		case "<=":
			return lessThanQueryInclusive;
		case "<":
			return lessThanQueryExclusive;
		case ">=":
			return greaterThanQueryInclusive;
		case ">":
			return greaterThanQueryExclusive;
		// We're pushing it a bit here - the bottom two aren't explicitly supported yet. Consider as experimental
		case "startsWith":
			return `${field}:${isConversionField ? convertedValue : replacedValue}*`;
		case "endsWith":
			return `${field}:*${isConversionField ? convertedValue : replacedValue}`;
		default:
			return equalsQuery;
	}
};
