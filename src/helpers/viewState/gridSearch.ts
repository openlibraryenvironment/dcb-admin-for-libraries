// For a route's validateSearch, which loads with every page: shapes only, and no codec or MUI X.
// The grid reads them against its own columns. docs/url-view-state.md.

import { stringifySearch } from "./searchSerialiser";

/** The codec's VIEW_PARAMS, restated so the first load does not carry the codec; a test keeps them equal. */
export const GRID_PARAMS = [
	"filters",
	"logic",
	"sort",
	"page",
	"pageSize",
	"hide",
	"show",
	"pinLeft",
	"pinRight",
	"order",
	"agg",
] as const;

const paramName = (param: string, namespace?: string) =>
	namespace ? `${namespace}.${param}` : param;

/**
 * Filter fields whose values never go in a URL, a remembered view or a saved filter: a patron
 * barcode is personal data and close to a credential, and a requester note is text a patron
 * wrote. Quick-search text is treated the same. docs/url-view-state.md.
 */
export const PRIVATE_FILTER_FIELDS: readonly string[] = ["patronBarcode", "requesterNote"];

type LegacyItem = Record<string, unknown>;
type ParamValue = string | number | (string | LegacyItem)[] | LegacyItem;

/** A grid's parameters as they arrive. */
export interface GridSearch {
	/** Readable `field[:operator]:value` text; an old link's JSON items are objects. */
	filters?: string | (string | LegacyItem)[];
	logic?: string;
	sort?: string;
	page?: number | string;
	pageSize?: number | string;
	hide?: string | string[];
	show?: string | string[];
}

/** A second grid's parameters, under its namespace: `audit.filters`. */
export type NamespacedGridSearch = Record<`${string}.${string}`, ParamValue | undefined>;

const MAX_REPEATS = 20;
const MAX_LEGACY_KEYS = 10;

const isRecord = (value: unknown): value is LegacyItem =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** A readable `field[:operator]:value` entry, or an old link's JSON item, on a private field. */
const isPrivateEntry = (entry: unknown) =>
	typeof entry === "string"
		? PRIVATE_FILTER_FIELDS.some((field) => entry.startsWith(`${field}:`))
		: isRecord(entry) && PRIVATE_FILTER_FIELDS.includes(String(entry.field));

const publicFilters = (value: ParamValue | undefined): ParamValue | undefined => {
	if (typeof value === "string") return isPrivateEntry(value) ? undefined : value;
	if (!Array.isArray(value)) return value;
	const kept = value.filter((entry) => !isPrivateEntry(entry));
	return kept.length > 0 ? kept : undefined;
};

/** Whether a link's filters for this grid name a private field, before validateGridSearch drops them. */
export const linksPrivateFilter = (search: Record<string, unknown>, namespace?: string) => {
	const value = search[paramName("filters", namespace)];
	return (Array.isArray(value) ? value : [value]).some(isPrivateEntry);
};

// The router replaces the address with the validated search before any beforeLoad runs, so only
// validateSearch sees a link's private filter: it notes the address it left, for beforeLoad
let privateRemovedFrom: string | null = null;

/** Whether validateGridSearch removed a private filter on the way to this search. */
export const removedPrivateFilter = (search: Record<string, unknown>): boolean =>
	privateRemovedFrom === stringifySearch(search);

/** The removal has reached history state, which says so from here on. */
export const forgetPrivateRemoval = () => {
	privateRemovedFrom = null;
};

const shape = (value: unknown): ParamValue | undefined => {
	if (typeof value === "string" || typeof value === "number") return value;
	if (!Array.isArray(value)) return undefined;
	const entries = value
		.filter((entry): entry is string | LegacyItem => typeof entry === "string" || isRecord(entry))
		.slice(0, MAX_REPEATS);
	return entries.length > 0 ? entries : undefined;
};

const shapeParam = (param: string, value: unknown) =>
	param === "filters" ? publicFilters(shape(value)) : shape(value);

/** An old link kept a second grid's state as one object under its namespace: `audit={"page":1,…}`. */
const legacyGroup = (value: unknown): LegacyItem | undefined => {
	if (!isRecord(value)) return undefined;
	const group: LegacyItem = {};
	for (const param of GRID_PARAMS) {
		const part = shapeParam(param, value[param]);
		if (part !== undefined) group[param] = part;
	}
	return Object.keys(group).length > 0 && Object.keys(value).length <= MAX_LEGACY_KEYS
		? group
		: undefined;
};

/** The page's main grid, and any other grid on the page by its namespace. */
export const validateGridSearch = (
	search: Record<string, unknown>,
	namespaces: readonly string[] = [],
): GridSearch & NamespacedGridSearch & Record<string, ParamValue | undefined> => {
	const valid: Record<string, ParamValue | undefined> = {};
	let removed = false;
	for (const namespace of [undefined, ...namespaces]) {
		if (linksPrivateFilter(search, namespace)) {
			removed = true;
			// The router's search is the link's own with this laid over it: a key left out keeps the link's value
			valid[paramName("filters", namespace)] = undefined;
		}
		for (const param of GRID_PARAMS) {
			const key = paramName(param, namespace);
			const value = shapeParam(param, search[key]);
			if (value !== undefined) valid[key] = value;
		}
		if (namespace) {
			const group = legacyGroup(search[namespace]);
			if (group) valid[namespace] = group;
		}
	}
	if (removed) privateRemovedFrom = stringifySearch(valid);
	return valid;
};
