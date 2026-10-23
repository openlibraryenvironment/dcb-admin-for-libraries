// For a route's validateSearch, which loads with every page: shapes only, and no codec or MUI X.
// The grid reads them against its own columns. docs/url-view-state.md.

/** The codec's VIEW_PARAMS, restated so the first load does not carry the codec; a test keeps them equal. */
export const GRID_PARAMS = ["filters", "logic", "sort", "page", "pageSize", "hide", "show"] as const;

const paramName = (param: string, namespace?: string) =>
	namespace ? `${namespace}.${param}` : param;

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

const shape = (value: unknown): ParamValue | undefined => {
	if (typeof value === "string" || typeof value === "number") return value;
	if (!Array.isArray(value)) return undefined;
	const entries = value
		.filter((entry): entry is string | LegacyItem => typeof entry === "string" || isRecord(entry))
		.slice(0, MAX_REPEATS);
	return entries.length > 0 ? entries : undefined;
};

/** An old link kept a second grid's state as one object under its namespace: `audit={"page":1,…}`. */
const legacyGroup = (value: unknown): LegacyItem | undefined => {
	if (!isRecord(value)) return undefined;
	const group: LegacyItem = {};
	for (const param of GRID_PARAMS) {
		const part = shape(value[param]);
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
	const valid: Record<string, ParamValue> = {};
	for (const namespace of [undefined, ...namespaces]) {
		for (const param of GRID_PARAMS) {
			const key = paramName(param, namespace);
			const value = shape(search[key]);
			if (value !== undefined) valid[key] = value;
		}
		if (namespace) {
			const group = legacyGroup(search[namespace]);
			if (group) valid[namespace] = group;
		}
	}
	return valid;
};
