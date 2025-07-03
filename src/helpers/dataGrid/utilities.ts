import {
	GridFilterModel,
	GridSortDirection,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";

export const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = "";
	if (columnFilterQueries.length > 0) {
		finalQuery = `(${columnFilterQueries.join(` ${logicOperator.toUpperCase()} `)})`;
	}

	if (quickFilterValues.length > 0) {
		const quickFilterQuery = quickFilterValues
			.map(
				(val) =>
					`(fromValue:*${val}* OR toValue:*${val}* OR fromCategory:*${val}* OR toCategory:*${val}*)`
			)
			.join(" AND ");

		if (finalQuery) {
			finalQuery += ` AND (${quickFilterQuery})`;
		} else {
			finalQuery = quickFilterQuery;
		}
	}

	if (baseQuery) {
		return finalQuery ? `${baseQuery} AND (${finalQuery})` : baseQuery;
	}
	return finalQuery;
};

export const normalizeSortModel = (sortModel: GridSortModel): GridSortModel => {
	return sortModel.map((sort) => ({
		...sort,
		sort: sort.sort?.toUpperCase() === "ASC" ? "asc" : "desc",
	}));
};

export const getSortOrderForServer = (sortOrder: GridSortDirection): string => {
	return sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";
};

export const checkIfFiltering = (
	filterModel: GridFilterModel,
	debouncedFilterModel: GridFilterModel
): boolean => {
	const hasActiveFilters =
		filterModel.items.some(
			(item) => item.value && item.value !== "" && item.value !== null
		) ||
		(filterModel.quickFilterValues && filterModel.quickFilterValues.length > 0);

	const hasActiveDebounceFilters =
		debouncedFilterModel.items.some(
			(item) => item.value && item.value !== "" && item.value !== null
		) ||
		(debouncedFilterModel.quickFilterValues &&
			debouncedFilterModel.quickFilterValues.length > 0);

	// We're filtering if there are active filters but they don't match debounced filters
	const isDifferent =
		JSON.stringify(filterModel) !== JSON.stringify(debouncedFilterModel);
	return !!hasActiveFilters && isDifferent;
};
