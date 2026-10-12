import { describe, expect, it } from "vitest";
import type { GridColDef } from "@mui/x-data-grid-premium";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { standardSupplierRequestColumns } from "@helpers/dataGrid/columns/supplierRequestColumns";
import { defaultLocationColumns } from "@helpers/dataGrid/columns/locationColumns";

const getter = (columns: GridColDef[], field: string) => {
	const column = columns.find((candidate) => candidate.field === field);
	if (!column?.valueGetter) throw new Error(`${field} has no valueGetter`);
	return (row: object) =>
		(column.valueGetter as (value: unknown, row: object) => unknown)(
			undefined,
			row,
		);
};

describe.each([
	["patron requests", standardPatronRequestColumns],
	["supplier requests", standardSupplierRequestColumns],
])("the %s grid", (_, columns) => {
	// GraphQL's `suppliers: [SupplierRequest]` is nullable; a null list threw
	// inside the grid and took the whole page down with it.
	it.each(["canonicalItemType", "itemBarcode"])(
		"renders %s as empty when a request has no suppliers",
		(field) => {
			expect(getter(columns, field)({ suppliers: null })).toBe("");
			expect(getter(columns, field)({ suppliers: [] })).toBe("");
		},
	);
});

describe("the location grid", () => {
	// It has no processRowUpdate, so an editable cell accepted a change that
	// was never saved and showed it as if it had been.
	it("offers no inline editing", () => {
		expect(defaultLocationColumns.filter((column) => column.editable)).toEqual(
			[],
		);
	});
});
