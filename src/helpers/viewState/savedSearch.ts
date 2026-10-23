import {
	filterToItem,
	filtersFromItems,
	isPrivateField,
	type GridRules,
} from "./gridView";
import {
	decodeFilter,
	decodeSort,
	encodeFilter,
	OPERATOR_WORDS,
	type UrlFilter,
	type UrlSort,
	type UrlView,
} from "./urlViewCodec";

/** What a saved filter restores: a grid's filter and sort, never its page or columns. */
export type SavedFilterSearch = Pick<UrlView, "filters" | "logic" | "sort">;

const MAX_FILTERS = 20;
const WORDS = new Set<string>(OPERATOR_WORDS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** A filter in the codec's own form, checked by writing and reading it back. */
const asUrlFilter = (raw: Record<string, unknown>): UrlFilter | null => {
	const { field, operator, values } = raw;
	if (
		typeof field !== "string" ||
		typeof operator !== "string" ||
		!WORDS.has(operator) ||
		!Array.isArray(values) ||
		!values.every((value) => typeof value === "string")
	) {
		return null;
	}
	const text = encodeFilter({ field, operator: operator as UrlFilter["operator"], values });
	return text === null ? null : decodeFilter(text);
};

const sortOf = (rules: GridRules, raw: unknown): UrlSort[] | undefined => {
	const sort =
		typeof raw === "string"
			? decodeSort(raw)
			: Array.isArray(raw)
				? decodeSort(
						raw
							.filter(isRecord)
							.map((entry) => `${String(entry.field)}:${String(entry.direction)}`)
							.join(","),
					)
				: null;
	if (sort === null || sort === "none") return undefined;
	const allowed = sort.filter((entry) => rules.sortable.has(entry.field));
	return allowed.length > 0 ? allowed : undefined;
};

/**
 * A stored search through the grid's allow-list, as a link is: filters this grid can take on
 * public fields, the logic and the sort. Reads the codec's form and the MUI items an earlier
 * release stored. docs/saved-filters.md.
 */
export const savedSearchOf = (rules: GridRules, raw: unknown): SavedFilterSearch => {
	const record = isRecord(raw) ? raw : {};
	const entries = (Array.isArray(record.filters) ? record.filters : [])
		.filter(isRecord)
		.slice(0, MAX_FILTERS);
	const filters = [
		...entries
			.filter((entry) => "values" in entry)
			.map(asUrlFilter)
			.filter((filter): filter is UrlFilter => filter !== null),
		...filtersFromItems(
			rules,
			entries.filter((entry) => !("values" in entry)),
		),
	].filter(
		(filter) => !isPrivateField(filter.field) && filterToItem(rules, filter, 0) !== null,
	);
	const search: SavedFilterSearch = { filters };
	if (record.logic === "or" && filters.length > 1) search.logic = "or";
	const sort = sortOf(rules, record.sort);
	if (sort) search.sort = sort;
	return search;
};
