import { z } from "zod";
import {
	getGridDefaultColumnTypes,
	GridColDef,
	GridColumnVisibilityModel,
	GridFilterItem,
	GridFilterModel,
	GridFilterOperator,
	GridLogicOperator,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";

import {
	DEFAULT_PAGE_SIZE,
	PAGE_SIZE_OPTIONS,
} from "@constants/dataGrid/pagination";
import type { RouteGridSearch } from "@helpers/dataGrid/gridSearchSchema";

/**
 * Filter fields whose values never go in a URL, only in the tab's history
 * entry: a patron barcode is personal data and close to a credential, and a
 * requester note is text a patron wrote. Quick-search text is treated the
 * same. docs/routing.md has the argument.
 */
export const PRIVATE_FILTER_FIELDS: readonly string[] = ["patronBarcode", "requesterNote"];

/** A reader who cleared the sort, as distinct from one who never chose. */
const NO_SORT = "none";

const MAX_FILTER_ITEMS = 20;
const MAX_LIST_VALUES = 50;
const MAX_QUICK_VALUES = 10;
const MAX_TEXT = 256;
const NUMERIC = /^-?\d+(\.\d+)?$/;

/** How an operator takes its value: the grid's own input decides the shape. */
type ValueKind = "none" | "scalar" | "list" | "range";

const RANGE_OPERATORS = new Set(["between", "luceneDateRange"]);
/** Built as dates whatever the column's type, so their values must be dates. */
const DATE_OPERATORS = new Set(["luceneDateRange", "onOrAfter", "onOrBefore"]);

const kindOf = (operator: GridFilterOperator): ValueKind => {
	if (operator.value === "isAnyOf") return "list";
	if (RANGE_OPERATORS.has(operator.value)) return "range";
	return operator.requiresFilterValue === false || !operator.InputComponent
		? "none"
		: "scalar";
};

interface FilterRule {
	operators: ReadonlyMap<string, ValueKind>;
	accepts: (value: unknown) => boolean;
}

const isText = (value: unknown): value is string =>
	typeof value === "string" && value.length <= MAX_TEXT;

const isEmpty = (value: unknown) =>
	value === undefined || value === null || value === "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isDateText = (value: unknown) =>
	typeof value === "string" && value.length <= 64 && !Number.isNaN(Date.parse(value));

const scalarCheck = (column: GridColDef): ((value: unknown) => boolean) => {
	switch (column.type) {
		case "number":
			return (value) =>
				(typeof value === "number" && Number.isFinite(value)) ||
				(typeof value === "string" && NUMERIC.test(value));
		case "boolean":
			return (value) =>
				typeof value === "boolean" || value === "true" || value === "false";
		case "date":
		case "dateTime":
			return isDateText;
		case "singleSelect": {
			const valueOptions =
				"valueOptions" in column ? column.valueOptions : undefined;
			// Options fetched at runtime (libraries) are not known here: any text.
			if (!Array.isArray(valueOptions)) return isText;
			const options = new Set<unknown>(
				valueOptions.map((option: unknown) =>
					isRecord(option) ? option.value : option,
				),
			);
			return (value) => options.has(value);
		}
		default:
			return isText;
	}
};

const filterRules = (
	columns: readonly GridColDef[],
): Map<string, FilterRule> => {
	const types = getGridDefaultColumnTypes();
	const rules = new Map<string, FilterRule>();
	for (const column of columns) {
		if (column.filterable === false || column.type === "actions") continue;
		const operators =
			column.filterOperators ??
			types[column.type ?? "string"]?.filterOperators ??
			[];
		rules.set(column.field, {
			operators: new Map(operators.map((op) => [op.value, kindOf(op)])),
			accepts: scalarCheck(column),
		});
	}
	return rules;
};

export interface GridSpec {
	/** Keys this grid's column-visibility preference and its history-state entry. */
	id: string;
	/** The search key holding this grid's state, or null for the route's own top level. */
	searchKey: string | null;
	/** The columns as rendered; they are the allow-lists for sort and filter. */
	columns: GridColDef[];
	defaultSort: GridSortModel;
	defaultPageSize?: number;
	defaultColumnVisibility: GridColumnVisibilityModel;
}

const parseItem = (
	rules: ReadonlyMap<string, FilterRule>,
	raw: unknown,
	fallbackId: number,
): GridFilterItem | null => {
	if (!isRecord(raw)) return null;
	const { id, field, operator, value } = raw;
	if (typeof field !== "string" || typeof operator !== "string") return null;
	const rule = rules.get(field);
	const kind = rule?.operators.get(operator);
	if (!rule || !kind) return null;

	const item: GridFilterItem = {
		id:
			(typeof id === "number" && Number.isSafeInteger(id)) ||
			(typeof id === "string" && id.length <= 64)
				? id
				: fallbackId,
		field,
		operator,
	};
	// A date operator on a column not typed as a date still builds a date query
	const accepts = DATE_OPERATORS.has(operator) ? isDateText : rule.accepts;
	// An item that filters nothing - a row just added, a range cleared - is not carried
	if (kind === "none") return item;
	if (kind === "scalar") {
		return !isEmpty(value) && accepts(value) ? { ...item, value } : null;
	}
	if (kind === "list") {
		return Array.isArray(value) &&
			value.length > 0 &&
			value.length <= MAX_LIST_VALUES &&
			value.every(accepts)
			? { ...item, value }
			: null;
	}
	return Array.isArray(value) &&
		value.length === 2 &&
		value.some((bound) => !isEmpty(bound)) &&
		value.every((bound) => isEmpty(bound) || accepts(bound))
		? { ...item, value: value.map((bound) => (isEmpty(bound) ? null : bound)) }
		: null;
};

const isPrivateField = (field: string) => PRIVATE_FILTER_FIELDS.includes(field);

const parsePublicItems = (
	rules: ReadonlyMap<string, FilterRule>,
	raw: readonly unknown[],
): GridFilterItem[] =>
	raw
		.slice(0, MAX_FILTER_ITEMS)
		.map((item, index) => parseItem(rules, item, index))
		.filter(
			(item): item is GridFilterItem =>
				item !== null && !isPrivateField(item.field),
		);

const parseSort = (sortable: ReadonlySet<string>, raw: string) => {
	if (raw === NO_SORT) return true;
	const [field, direction, ...rest] = raw.split(":");
	return (
		rest.length === 0 &&
		sortable.has(field) &&
		(direction === "asc" || direction === "desc")
	);
};

const searchSchemaFor = (
	rules: ReadonlyMap<string, FilterRule>,
	sortable: ReadonlySet<string>,
) =>
	z.object({
		page: z.number().int().min(0).optional().catch(undefined),
		pageSize: z
			.number()
			.refine((size) => PAGE_SIZE_OPTIONS.includes(size))
			.optional()
			.catch(undefined),
		sort: z
			.string()
			.refine((sort) => parseSort(sortable, sort))
			.optional()
			.catch(undefined),
		filters: z
			.array(z.unknown())
			.transform((items) => {
				const parsed = parsePublicItems(rules, items);
				return parsed.length > 0 ? parsed : undefined;
			})
			.optional()
			.catch(undefined),
		logic: z.enum(["and", "or"]).optional().catch(undefined),
	});

export type GridSearch = z.output<ReturnType<typeof searchSchemaFor>>;

export const defineGrid = (spec: GridSpec) => {
	const filters = filterRules(spec.columns);
	const sortable = new Set(
		spec.columns
			.filter((column) => column.sortable !== false && column.type !== "actions")
			.map((column) => column.field),
	);
	return {
		...spec,
		defaultPageSize: spec.defaultPageSize ?? DEFAULT_PAGE_SIZE,
		filters,
		/** For the route's validateSearch: every key `.catch()`es to absent. */
		searchSchema: searchSchemaFor(filters, sortable),
	};
};

export type GridDefinition = ReturnType<typeof defineGrid>;

/** What a grid keeps in its history entry rather than its URL. */
export interface PrivateGridState {
	/** Each with its position in the full filter list, so the panel keeps its order. */
	items: { index: number; item: GridFilterItem }[];
	quickFilterValues: string[];
}

export interface GridModels {
	filterModel: GridFilterModel;
	sortModel: GridSortModel;
	paginationModel: GridPaginationModel;
}

/** History state is written by this app but read back from the browser: checked like a URL. */
export const parsePrivateState = (
	grid: GridDefinition,
	raw: unknown,
): PrivateGridState | undefined => {
	if (!isRecord(raw)) return undefined;
	const items = (Array.isArray(raw.items) ? raw.items : [])
		.slice(0, MAX_FILTER_ITEMS)
		.flatMap((entry) => {
			if (!isRecord(entry)) return [];
			const { index, item } = entry;
			if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
				return [];
			const parsed = parseItem(grid.filters, item, index);
			return parsed && isPrivateField(parsed.field)
				? [{ index, item: parsed }]
				: [];
		});
	const quickFilterValues = (
		Array.isArray(raw.quickFilterValues) ? raw.quickFilterValues : []
	)
		.filter(isText)
		.slice(0, MAX_QUICK_VALUES);
	return items.length > 0 || quickFilterValues.length > 0
		? { items, quickFilterValues }
		: undefined;
};

/**
 * Values as JSON will carry them, so a draft compares equal to what it becomes. The date
 * pickers hand over Dayjs objects, which like a Date serialise through toJSON (null if invalid).
 */
const plainValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(plainValue);
	if (typeof (value as { toJSON?: unknown } | null)?.toJSON === "function") {
		return (value as { toJSON: () => unknown }).toJSON();
	}
	return value;
};

export const filterToSearch = (
	grid: GridDefinition,
	model: GridFilterModel,
): {
	search: Pick<GridSearch, "filters" | "logic">;
	state: PrivateGridState | undefined;
} => {
	const publicItems: unknown[] = [];
	const privateItems: { index: number; item: unknown }[] = [];
	model.items.forEach((item, index) => {
		const plain = { ...item, value: plainValue(item.value) };
		if (isPrivateField(item.field)) privateItems.push({ index, item: plain });
		else publicItems.push(plain);
	});
	const { filters } = grid.searchSchema.parse({ filters: publicItems });
	const state = parsePrivateState(grid, {
		items: privateItems,
		quickFilterValues: model.quickFilterValues ?? [],
	});
	// MUI keeps OR after "Remove all": joining fewer than two filters, it would outlive them in the URL
	const clauses = (filters?.length ?? 0) + (state?.items.length ?? 0);
	return {
		search: {
			filters,
			logic: model.logicOperator === GridLogicOperator.Or && clauses > 1 ? "or" : undefined,
		},
		state,
	};
};

/** Rows the URL does not carry: one the reader has not finished, or a value its column cannot take. */
export const hasDraftItems = (grid: GridDefinition, model: GridFilterModel): boolean => {
	const { search, state } = filterToSearch(grid, model);
	return (search.filters?.length ?? 0) + (state?.items.length ?? 0) < model.items.length;
};

const sameSort = (a: GridSortModel, b: GridSortModel) =>
	a.length === b.length &&
	a.every(
		(entry, index) =>
			entry.field === b[index].field && entry.sort === b[index].sort,
	);

export const sortToSearch = (
	grid: GridDefinition,
	model: GridSortModel,
): Pick<GridSearch, "sort"> => {
	if (sameSort(model, grid.defaultSort)) return { sort: undefined };
	const [first] = model;
	const raw = first?.sort ? `${first.field}:${first.sort}` : NO_SORT;
	return { sort: grid.searchSchema.parse({ sort: raw }).sort };
};

export const paginationToSearch = (
	grid: GridDefinition,
	model: GridPaginationModel,
): Pick<GridSearch, "page" | "pageSize"> => {
	const { page, pageSize } = grid.searchSchema.parse({
		page: model.page,
		pageSize: model.pageSize,
	});
	return {
		page: page === 0 ? undefined : page,
		pageSize: pageSize === grid.defaultPageSize ? undefined : pageSize,
	};
};

/** The whole grid, split between what a URL may carry and what it may not. */
export const serialiseGrid = (
	grid: GridDefinition,
	models: GridModels,
): { search: GridSearch; state: PrivateGridState | undefined } => {
	const filter = filterToSearch(grid, models.filterModel);
	return {
		search: {
			...filter.search,
			...sortToSearch(grid, models.sortModel),
			...paginationToSearch(grid, models.paginationModel),
		},
		state: filter.state,
	};
};

/** The route checked the URL's shape only; this grid's allow-list applies here, before any query. */
export const readFilter = (
	grid: GridDefinition,
	raw: Pick<RouteGridSearch, "filters" | "logic">,
	state: unknown,
): GridFilterModel => {
	const search = grid.searchSchema.parse(raw);
	const hidden = parsePrivateState(grid, state);
	const items = [...(search.filters ?? [])];
	for (const { index, item } of [...(hidden?.items ?? [])].sort(
		(a, b) => a.index - b.index,
	)) {
		items.splice(Math.min(index, items.length), 0, item);
	}

	const filterModel: GridFilterModel = { items };
	if (search.logic === "or") filterModel.logicOperator = GridLogicOperator.Or;
	if (hidden?.quickFilterValues.length) {
		filterModel.quickFilterValues = hidden.quickFilterValues;
	}
	return filterModel;
};

export const readSort = (
	grid: GridDefinition,
	raw: RouteGridSearch["sort"],
): GridSortModel => {
	const { sort } = grid.searchSchema.parse({ sort: raw });
	if (sort === undefined) return grid.defaultSort;
	if (sort === NO_SORT) return [];
	const [field, direction] = sort.split(":");
	return [{ field, sort: direction === "asc" ? "asc" : "desc" }];
};

export const readGrid = (
	grid: GridDefinition,
	search: RouteGridSearch,
	state: unknown,
): GridModels => ({
	filterModel: readFilter(grid, search, state),
	sortModel: readSort(grid, search.sort),
	paginationModel: {
		page: search.page ?? 0,
		pageSize: search.pageSize ?? grid.defaultPageSize,
	},
});
