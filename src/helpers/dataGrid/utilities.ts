import { currentClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import {
	GridFilterModel,
	GridSortDirection,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { asTerm, buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import i18n from "@/i18n";

export const processGridFilterModel = (
	model: GridFilterModel,
	baseQuery: string,
	quickFilterFields: string[] = [],
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = "";
	if (columnFilterQueries.length > 0) {
		finalQuery = `(${columnFilterQueries.join(` ${logicOperator.toUpperCase()} `)})`;
	}
	if (quickFilterValues.length > 0 && quickFilterFields.length > 0) {
		const quickFilterQuery = quickFilterValues
			.map((val) => {
				// Create an OR condition for every field provided in quickFilterFields
				// To be refined into a "universal search" at some point
				const fieldSearches = quickFilterFields.map(
					(field) => `${field}:*${asTerm(val)}*`,
				);
				return `(${fieldSearches.join(" OR ")})`;
			})
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
	debouncedFilterModel: GridFilterModel,
): boolean => {
	const hasActiveFilters =
		filterModel.items.some(
			(item) => item.value && item.value !== "" && item.value !== null,
		) ||
		(filterModel.quickFilterValues && filterModel.quickFilterValues.length > 0);

	// We're filtering if there are active filters but they don't match debounced filters
	const isDifferent =
		JSON.stringify(filterModel) !== JSON.stringify(debouncedFilterModel);
	return !!hasActiveFilters && isDifferent;
};

/** How a description names a column, an operator and a value: the grid's own words, not its ids. */
export interface FilterLabels {
	field: (field: string) => string;
	operator: (field: string, operator: string) => string;
	value: (field: string, value: unknown) => string;
}

const RAW_LABELS: FilterLabels = {
	field: (field) => field,
	operator: (_field, operator) => operator,
	value: (_field, value) => String(value),
};

/** Describes every item it is given: the caller passes the active ones. */
export const generateFilterDescription = (
	model?: GridFilterModel,
	labels: FilterLabels = RAW_LABELS,
): string => {
	const items = model?.items ?? [];
	if (items.length === 0) return i18n.t("ui.data_grid.filters.title");

	const logicOperator = model?.logicOperator || "AND";

	const descriptions = items.map((item) => {
		const field = labels.field(item.field);
		const value = item.value;

		if (item.operator === "luceneDateRange" && Array.isArray(value)) {
			const [start, end] = value;
			const hasStart = start !== null && start !== undefined && start !== "";
			const hasEnd = end !== null && end !== undefined && end !== "";
			const formattedStart = hasStart ? formatTimestamp(start, currentClock()) : "";
			const formattedEnd = hasEnd ? formatTimestamp(end, currentClock()) : "";
			if (hasStart && hasEnd) {
				return `${field} ${i18n.t("ui.data_grid.filters.between").toLowerCase()} ${formattedStart} ${i18n.t("ui.data_grid.filters.and")} ${formattedEnd}`;
			}
			if (hasStart) {
				return `${field} ${i18n.t("ui.data_grid.filters.after").toLowerCase()} ${formattedStart}`;
			}
			return `${field} ${i18n.t("ui.data_grid.filters.before").toLowerCase()} ${formattedEnd}`;
		}

		const operator = labels.operator(item.field, item.operator);
		if (value === undefined || value === null || value === "") return `${field} ${operator}`;
		const shown = Array.isArray(value)
			? `(${value.map((each) => labels.value(item.field, each)).join(", ")})`
			: typeof value === "object"
				? JSON.stringify(value)
				: labels.value(item.field, value);
		return `${field} ${operator} ${shown}`;
	});

	return i18n.t("ui.data_grid.filters.active_description", {
		length: items.length,
		description: descriptions.join(` ${logicOperator.toUpperCase()} `),
	});
};
