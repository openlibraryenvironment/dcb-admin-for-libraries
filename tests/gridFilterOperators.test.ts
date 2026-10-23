import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import type { GridColDef } from "@mui/x-data-grid-premium";

import * as grids from "@helpers/dataGrid/gridDefinitions";
import {
	PRIVATE_FILTER_FIELDS,
	filterFromView,
	filterToView,
} from "@helpers/viewState/gridView";
import { decodeFilter, encodeFilter } from "@helpers/viewState/urlViewCodec";

/** A value as the column's own filter input hands it over: a picker gives Dayjs, a select an option. */
const inputValue = (column: GridColDef): unknown => {
	switch (column.type) {
		case "date":
		case "dateTime":
			return dayjs("2026-10-01T09:30:00.000Z");
		case "boolean":
			return "true";
		case "number":
			return "3";
		case "singleSelect": {
			const options = "valueOptions" in column ? column.valueOptions : undefined;
			if (!Array.isArray(options) || options.length === 0) return "abc";
			const first = options[0] as unknown;
			return typeof first === "object" && first !== null && "value" in first
				? first.value
				: first;
		}
		default:
			return "abc";
	}
};

const DATE_OPERATORS = new Set(["luceneDateRange", "onOrAfter", "onOrBefore"]);

const cases = Object.values(grids).flatMap((grid) =>
	grid.columns
		.filter((column) => column.filterable !== false && grid.rules.filters.has(column.field))
		.flatMap((column) =>
			[...grid.rules.filters.get(column.field)!.operators].map(([operator, kind]) => ({
				grid,
				column,
				operator,
				kind,
				name: `${grid.id} ${column.field} ${operator}`,
			})),
		),
);

describe("every filter each grid offers", () => {
	it("has cases to check", () => {
		expect(cases.length).toBeGreaterThan(50);
	});

	it.each(cases)("$name survives the URL, readably, with the value its input gives", ({
		grid,
		column,
		operator,
		kind,
	}) => {
		const sample = DATE_OPERATORS.has(operator)
			? dayjs("2026-10-01T09:30:00.000Z")
			: inputValue(column);
		const value =
			kind === "none"
				? undefined
				: kind === "list"
					? [sample]
					: kind === "range"
						? [sample, null]
						: sample;
		const { filters, privateState } = filterToView(grid.rules, {
			items: [{ id: 1, field: column.field, operator, value }],
		});

		if (PRIVATE_FILTER_FIELDS.includes(column.field)) {
			expect(filters).toEqual([]);
			expect(privateState?.items).toHaveLength(1);
			return;
		}
		expect(filters).toHaveLength(1);
		const text = encodeFilter(filters[0]);
		expect(text, "the grammar states it").not.toBeNull();
		const [item] = filterFromView(grid.rules, { filters: [decodeFilter(text)!] }).items;
		// One value of "is any of" is "is": the URL has one word for both, read back as the column's equality
		const readBackAs =
			kind === "list" && !Array.isArray(item?.value)
				? ["is", "equals", "="]
				: [operator];
		expect(item, "and the grid reads it back").toMatchObject({ field: column.field });
		expect(readBackAs).toContain(item.operator);
	});
});
