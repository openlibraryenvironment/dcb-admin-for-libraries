import type { OperatorWord } from "./urlViewCodec";

// No MUI X here: Home builds its drill-down links with this, outside any grid.

/** MUI X operator values, ours and its defaults, to the URL's words. docs/url-view-state.md. */
export const WORD_OF: Readonly<Record<string, OperatorWord>> = {
	equals: "is",
	is: "is",
	"=": "is",
	isAnyOf: "is",
	not: "not",
	"!=": "not",
	doesNotEqual: "not",
	"does not equal": "not",
	"Does not equal": "not",
	contains: "contains",
	containsPhrase: "phrase",
	doesNotContain: "notContains",
	"does not contain": "notContains",
	startsWith: "startsWith",
	endsWith: "endsWith",
	onOrAfter: "from",
	onOrBefore: "to",
	after: "after",
	before: "before",
	between: "between",
	luceneDateRange: "between",
	">=": "min",
	"<=": "max",
	">": "over",
	"<": "under",
	isEmpty: "empty",
	isNotEmpty: "notEmpty",
	last30Days: "last30Days",
	last90Days: "last90Days",
};

export const operatorWord = (operator: string): OperatorWord | undefined =>
	WORD_OF[operator];
