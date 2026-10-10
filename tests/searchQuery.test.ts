import { describe, expect, it } from "vitest";

import { buildQuery } from "../src/helpers/search/queryBuilder";
import { parseQuery } from "../src/helpers/search/queryParser";
import {
	BooleanOperator,
	SearchField,
	type SearchFilter,
} from "../src/models/SearchTypes";

const filter = (
	field: SearchField,
	value: string,
	operator?: BooleanOperator,
): SearchFilter => ({ id: "x", field, value, ...(operator && { operator }) });

/** The URL holds the built query and the form is rebuilt from it on load. */
const roundTrip = (filters: SearchFilter[]) =>
	parseQuery(buildQuery(filters)).map(({ field, value, operator }) => ({
		field,
		value,
		...(operator && { operator }),
	}));

const shape = (filters: SearchFilter[]) =>
	filters.map(({ field, value, operator }) => ({
		field,
		value,
		...(operator && { operator }),
	}));

describe("the search query, built and read back", () => {
	it("round-trips a single filter", () => {
		const filters = [filter(SearchField.Title, "Middlemarch")];
		expect(roundTrip(filters)).toEqual(shape(filters));
	});

	it("does not split a value on a Boolean word inside its quotes", () => {
		const filters = [
			filter(SearchField.Title, "War AND Peace"),
			filter(SearchField.Author, "Tolstoy OR Tolstoi", BooleanOperator.OR),
			filter(SearchField.Subject, "Rich NOT poor", BooleanOperator.NOT),
		];
		expect(roundTrip(filters)).toEqual(shape(filters));
	});

	it("survives a quote inside a value", () => {
		const filters = [
			filter(SearchField.Title, 'The "AND" problem'),
			filter(SearchField.ISBN, "9780141439549", BooleanOperator.AND),
		];
		expect(roundTrip(filters)).toEqual(shape(filters));
	});

	it("round-trips a cluster record ID", () => {
		const filters = [
			filter(SearchField.ClusterRecordID, "aaaaaaaa-0000-4000-8000-000000000001"),
		];
		expect(roundTrip(filters)).toEqual(shape(filters));
	});

	it("reads hand-typed text as a keyword, not as a record ID", () => {
		expect(shape(parseQuery("keyword:middlemarch"))).toEqual([
			{ field: SearchField.Keyword, value: "keyword:middlemarch" },
		]);
	});

	it("never sends a cluster record ID that is not a UUID", () => {
		expect(buildQuery([filter(SearchField.ClusterRecordID, "title=x) OR (")])).toBe(
			"",
		);
		expect(
			buildQuery([
				filter(SearchField.Title, "x"),
				filter(
					SearchField.ClusterRecordID,
					"aaaaaaaa-0000-4000-8000-000000000001",
					BooleanOperator.AND,
				),
			]),
		).toBe("");
	});
});
