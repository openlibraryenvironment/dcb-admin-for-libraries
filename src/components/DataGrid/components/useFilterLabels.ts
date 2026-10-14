import { useMemo } from "react";
import { type GridTranslationKeys, useGridApiContext } from "@mui/x-data-grid-premium";

import { useClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import type { FilterLabels } from "@helpers/dataGrid/utilities";

/** A filter's column, operator and value as this grid names them on screen. */
export const useFilterLabels = (): FilterLabels => {
	const apiRef = useGridApiContext();
	const clock = useClock();

	return useMemo(() => {
		const columnOf = (field: string) => apiRef.current.getColumn(field);
		return {
			field: (field) => columnOf(field)?.headerName ?? field,
			operator: (field, operator) => {
				const own = columnOf(field)?.filterOperators?.find((op) => op.value === operator);
				if (own?.label) return own.label;
				// MUI's own operators are named in its locale text, as the filter panel names them
				const key = `filterOperator${operator.charAt(0).toUpperCase()}${operator.slice(1)}`;
				const text = apiRef.current.getLocaleText(key as GridTranslationKeys);
				return typeof text === "string" ? text : operator;
			},
			value: (field, value) => {
				const column = columnOf(field);
				if (column?.type === "date" || column?.type === "dateTime") {
					return typeof value === "string" ? formatTimestamp(value, clock) : String(value);
				}
				if (column?.type === "boolean" || typeof value === "boolean") {
					const yes = value === true || value === "true";
					return apiRef.current.getLocaleText(yes ? "filterValueTrue" : "filterValueFalse");
				}
				if (column?.type === "singleSelect" && "valueOptions" in column) {
					const options = Array.isArray(column.valueOptions) ? column.valueOptions : [];
					const option = options.find(
						(each: unknown) =>
							typeof each === "object" &&
							each !== null &&
							"value" in each &&
							each.value === value,
					) as { label?: string } | undefined;
					if (option?.label) return option.label;
				}
				return String(value);
			},
		};
	}, [apiRef, clock]);
};
