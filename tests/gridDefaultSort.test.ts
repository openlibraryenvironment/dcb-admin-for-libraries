import { describe, expect, it } from "vitest";

import * as grids from "@helpers/dataGrid/gridDefinitions";

describe("a grid's default sort", () => {
	it.each(Object.values(grids).map((grid) => [grid.id, grid] as const))(
		"%s names a sortable column it renders and shows by default",
		(_id, grid) => {
			for (const { field } of grid.defaultSort) {
				const column = grid.columns.find((each) => each.field === field);
				expect(column, field).toBeDefined();
				expect(column?.sortable, field).not.toBe(false);
				// Hidden, no header shows the arrow or aria-sort for the order the rows are in
				expect(grid.defaultColumnVisibility[field], field).not.toBe(false);
			}
		},
	);
});
