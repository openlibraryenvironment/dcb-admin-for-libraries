import type { GridColDef, GridColumnVisibilityModel, GridSortModel } from "@mui/x-data-grid-premium";

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";
import type { GridViewId } from "./gridViewIds";
import { gridRules, type GridViewSpec } from "./gridView";

interface GridDefaults {
	/** The columns as rendered; they are the allow-lists for sort and filter. */
	columns: GridColDef[];
	defaultSort: GridSortModel;
	defaultPageSize?: number;
	defaultColumnVisibility: GridColumnVisibilityModel;
}

export const defineGrid = (view: GridViewId, defaults: GridDefaults) => {
	const spec: GridViewSpec = {
		...view,
		defaultSort: defaults.defaultSort,
		defaultPageSize: defaults.defaultPageSize ?? DEFAULT_PAGE_SIZE,
		pageSizeOptions: PAGE_SIZE_OPTIONS,
		defaultColumnVisibility: defaults.defaultColumnVisibility,
	};
	return { ...spec, columns: defaults.columns, rules: gridRules(defaults.columns) };
};

export type GridDefinition = ReturnType<typeof defineGrid>;
