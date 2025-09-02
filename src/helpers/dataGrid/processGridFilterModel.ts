import { GridFilterModel } from "@mui/x-data-grid-premium";
import { buildFilterQuery } from "./buildFilterQuery";

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
