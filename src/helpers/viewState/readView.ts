import { filtersFromItems, type GridRules } from "./gridView";
import { decodeView, paramName, VIEW_PARAMS, type UrlView } from "./urlViewCodec";

const MAX_FILTERS = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const asList = (raw: unknown): unknown[] =>
	raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];

/**
 * A grid's view from its route's search, old links included: filters as JSON items, and a second
 * grid's state as one object under its namespace. Either makes the page zero-based, as those
 * links wrote it. docs/url-view-state.md, "Old links".
 */
export const readView = (
	rules: GridRules,
	search: Readonly<Record<string, unknown>>,
	namespace?: string,
): UrlView => {
	const ownKeys = VIEW_PARAMS.map((param) => paramName(param, namespace));
	const group =
		namespace && isRecord(search[namespace]) && ownKeys.every((key) => search[key] === undefined)
			? (search[namespace] as Record<string, unknown>)
			: undefined;
	const source: Record<string, unknown> = group
		? Object.fromEntries(VIEW_PARAMS.map((param) => [paramName(param, namespace), group[param]]))
		: { ...search };

	const items = asList(source[paramName("filters", namespace)]).filter(isRecord);
	const view = decodeView(source, namespace, group !== undefined || items.length > 0);
	if (items.length > 0) {
		view.filters = [...view.filters, ...filtersFromItems(rules, items)].slice(0, MAX_FILTERS);
	}
	return view;
};
