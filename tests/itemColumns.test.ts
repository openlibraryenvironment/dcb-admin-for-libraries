import { describe, expect, it } from "vitest";
import { gridDateComparator, type GridColDef } from "@mui/x-data-grid-premium";

import { itemColumns } from "@helpers/dataGrid/columns/itemColumns";

const column = (field: string) => itemColumns.find((each) => each.field === field)!;

const sortedBy = (definition: GridColDef, dates: (string | null)[]) => {
	const getValue = definition.valueGetter as unknown as (
		value: unknown,
		row: Record<string, string | null>,
	) => Date | null;
	return dates
		.map((date) => ({ date, value: getValue(undefined, { [definition.field]: date }) }))
		.sort((a, b) =>
			gridDateComparator(a.value, b.value, undefined as never, undefined as never),
		)
		.map(({ date }) => date);
};

describe("an item's dates", () => {
	it.each(["dueDate", "availabilityDate"])("%s sorts by date, not by its text", (field) => {
		expect(column(field).type).toBe("date");
		expect(
			sortedBy(column(field), ["2026-10-01", "2026-09-22", "2027-01-03", null]),
		).toEqual([null, "2026-09-22", "2026-10-01", "2027-01-03"]);
	});
});
