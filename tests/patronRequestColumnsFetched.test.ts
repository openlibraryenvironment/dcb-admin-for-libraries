import { describe, expect, it } from "vitest";
import { Kind, parse, type SelectionSetNode } from "graphql";
import { getPatronRequests } from "@queries/getPatronRequests";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { standardSupplierRequestColumns } from "@helpers/dataGrid/columns/supplierRequestColumns";

/**
 * A column that reads its own field straight off the row shows an empty cell,
 * with a working filter and sort, when the grid's query never selects it.
 */
const contentFields = (): Set<string> => {
	const document = parse(getPatronRequests);
	const fields = new Set<string>();
	const find = (set: SelectionSetNode | undefined): SelectionSetNode | undefined => {
		for (const selection of set?.selections ?? []) {
			if (selection.kind !== Kind.FIELD) continue;
			if (selection.name.value === "content") return selection.selectionSet;
			const nested = find(selection.selectionSet);
			if (nested) return nested;
		}
		return undefined;
	};
	const operation = document.definitions[0];
	if (operation.kind !== Kind.OPERATION_DEFINITION) return fields;
	for (const selection of find(operation.selectionSet)?.selections ?? []) {
		if (selection.kind === Kind.FIELD) fields.add(selection.name.value);
	}
	return fields;
};

describe.each([
	["patron requests", standardPatronRequestColumns],
	["supplier requests", standardSupplierRequestColumns],
])("the %s grid", (_, columns) => {
	it("fetches every field a column reads directly", () => {
		const fetched = contentFields();
		const unfetched = columns
			.filter((column) => !column.valueGetter && !fetched.has(column.field))
			.map((column) => column.field);
		expect(unfetched).toEqual([]);
	});
});
