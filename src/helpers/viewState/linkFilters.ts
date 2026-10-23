import type { GridFilterItem } from "@mui/x-data-grid-premium";

import { operatorWord } from "./operatorWords";
import { encodeFilter } from "./urlViewCodec";

// No MUI X at run time: for links into a grid from outside it, such as Home's counts.

/** A grid's filter items as a link's readable `filters`, for a link built outside the grid. */
export const linkFilters = (items: readonly GridFilterItem[]): string[] =>
	items.flatMap((item) => {
		const operator = operatorWord(item.operator);
		if (!operator) return [];
		const values = Array.isArray(item.value)
			? item.value.map((value) => (value === null || value === undefined ? "" : String(value)))
			: item.value === undefined || item.value === null
				? []
				: [String(item.value)];
		const text = encodeFilter({ field: item.field, operator, values });
		return text === null ? [] : [text];
	});
