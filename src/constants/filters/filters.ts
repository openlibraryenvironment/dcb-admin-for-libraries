import { betweenFilterOperator } from "./rangeFilterOperator";
import {
	getGridNumericOperators,
	getGridSingleSelectOperators,
	getGridStringOperators,
	GridCellParams,
	GridFilterInputValue,
	GridFilterOperator,
} from "@mui/x-data-grid-premium";
import i18n from "@/i18n";

// A server-filtered grid sends these to buildFilterQuery; getApplyFilterFn is
// only used where a grid filters on the client.

const doesNotEqualFilter: GridFilterOperator = {
	label: i18n.t("ui.data_grid.filters.not_equal"),
	value: "does not equal",
	getApplyFilterFn: (filterItem) => {
		if (!filterItem.field || !filterItem.value || !filterItem.operator) {
			return null;
		}
		return (params) => params[filterItem.field] !== filterItem.value;
	},
	InputComponent: GridFilterInputValue,
};

const doesNotContainFilter: GridFilterOperator = {
	label: i18n.t("ui.data_grid.filters.does_not_contain"),
	value: "does not contain",
	getApplyFilterFn: (filterItem) => {
		if (!filterItem.field || !filterItem.value) {
			return null;
		}

		return (params: GridCellParams) => {
			const cellValue = params[filterItem.field as keyof GridCellParams];
			if (typeof cellValue === "string") {
				return !cellValue.includes(filterItem.value as string);
			}
			return false; // If cell value is not a string, the filter does not apply
		};
	},
	InputComponent: GridFilterInputValue,
};

export const standardFilters: GridFilterOperator[] = [
	...getGridStringOperators().filter(({ value }) =>
		["equals", "contains"].includes(value)
	),
	doesNotEqualFilter,
	doesNotContainFilter,
];

export const isOnly: GridFilterOperator[] = [
	...getGridSingleSelectOperators().filter(({ value }) =>
		["is"].includes(value)
	),
];

export const equalsOnly: GridFilterOperator[] = [
	...getGridStringOperators().filter(({ value }) => ["equals"].includes(value)),
	doesNotEqualFilter,
];

export const equalsSingular: GridFilterOperator[] = [
	...getGridStringOperators().filter(({ value }) => ["equals"].includes(value)),
];

export const containsOnly: GridFilterOperator[] = [
	...getGridStringOperators().filter(({ value }) =>
		["contains"].includes(value)
	),
	doesNotContainFilter,
];

// For more exact numeric values
export const numericFilters: GridFilterOperator[] = [
	...getGridNumericOperators().filter((operator) =>
		["<=", ">=", "<", ">", "=", "!="].includes(operator.value)
	),
	betweenFilterOperator,
];

// For durations, which are shown in days and don't need the same precision.
export const durationFilters: GridFilterOperator[] = [
	...getGridNumericOperators().filter((operator) =>
		["<", ">"].includes(operator.value)
	),
	betweenFilterOperator,
];
