import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import type {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridPinnedColumnFields,
	GridSortModel,
} from "@mui/x-data-grid-premium";

import { MAX_PAGE } from "@constants/dataGrid/pagination";
import { useRememberedViewStore } from "@/hooks/rememberedViewStore";
import type { GridDefinition } from "@helpers/viewState/defineGrid";
import {
	filterFromView,
	filterToView,
	itemToFilter,
	modelsToView,
	orderFromView,
	orderToView,
	paginationFromView,
	paginationToView,
	parsePrivateState,
	pinnedFromView,
	pinnedToView,
	sortFromView,
	sortToView,
	visibilityFromView,
	visibilityToView,
	type GridModels,
	type PrivateGridState,
} from "@helpers/viewState/gridView";
import { readView } from "@helpers/viewState/readView";
import { savedSearchOf, type SavedFilterSearch } from "@helpers/viewState/savedSearch";
import {
	emptyView,
	encodeView,
	paramName,
	VIEW_PARAMS,
	type UrlView,
	type ViewParam,
} from "@helpers/viewState/urlViewCodec";

const FILTER_DEBOUNCE_MS = 500;

const FILTER_PARAMS = ["filters", "logic"] as const satisfies ViewParam[];
const SORT_PARAMS = ["sort"] as const satisfies ViewParam[];
const PAGE_PARAMS = ["page", "pageSize"] as const satisfies ViewParam[];
const COLUMN_PARAMS = ["hide", "show"] as const satisfies ViewParam[];
const PIN_PARAMS = ["pinLeft", "pinRight"] as const satisfies ViewParam[];
const ORDER_PARAMS = ["order"] as const satisfies ViewParam[];

type Search = Record<string, unknown>;

/** A grid's pinning and order, read from and written to its URL. DataGrid applies them. */
export interface ColumnLayout {
	pinnedColumns: GridPinnedColumnFields;
	onPinnedColumnsChange: (model: GridPinnedColumnFields) => void;
	/** The shareable fields, in order; columns the URL cannot name keep their places. */
	columnOrder: readonly string[];
	onColumnOrderChange: (fields: string[]) => void;
	/** Bumped on Back, Forward or a link: DataGrid remounts the grid on it. */
	visit: number;
}

/** What the toolbar needs to share the grid's view as a link, save its filter, and reset it. */
export interface GridViews {
	gridId: string;
	/** The filter and sort as the grid shows them, as a saved filter holds them. */
	current: SavedFilterSearch;
	/** A barcode filter or search text narrows the grid: neither goes in a link or a saved filter. */
	hasPrivate: boolean;
	/** Rule 2: the view is the reader's last one, restored onto a bare address. */
	restored: boolean;
	/** Writes a filter still waiting on the debounce, so the address is the grid as shown. */
	flush: () => Promise<void>;
	apply: (search: SavedFilterSearch) => void;
	/** Every filter and the sort back to the grid's own, on the first page. */
	reset: () => void;
	/** Rule 2's Reset: the grid's defaults, a bare address, and nothing remembered. */
	resetView: () => void;
	/** A stored search through this grid's allow-list, as a link is. */
	sanitise: (search: unknown) => SavedFilterSearch;
	/** A saved filter as the grid's filter model, to describe it in words. */
	toFilterModel: (search: SavedFilterSearch) => GridFilterModel;
}

/** A filter as the URL and history entry will hold it, so a typed one can be matched to its arrival. */
const filterKey = (grid: GridDefinition, model: GridFilterModel) => {
	const { filters, logic, privateState } = filterToView(grid.rules, model);
	return JSON.stringify([
		filters,
		logic,
		privateState?.items.map(({ index, item }) => [index, itemToFilter(grid.rules, item)]),
		privateState?.quickFilterValues,
	]);
};

/** The grid's own parameters, and an old link's group under its namespace: what the view is read from. */
const ownSearch = (grid: GridDefinition, search: Search | undefined): string =>
	JSON.stringify([
		VIEW_PARAMS.map((param) => search?.[paramName(param, grid.namespace)] ?? null),
		grid.namespace ? (search?.[grid.namespace] ?? null) : null,
	]);

/**
 * A server-paged grid's filter, sort, page, page size and columns, read from and written to its
 * route's search, readably. docs/url-view-state.md says how to add a grid.
 */
export const useSyncedDataGrid = (grid: GridDefinition, search: Search | undefined) => {
	const navigate = useNavigate();
	const router = useRouter();
	const { id, namespace, rules } = grid;
	// The page this grid is on: a write that runs after the reader has left it must not land elsewhere
	const pathname = useLocation({ select: (location) => location.pathname });
	const onPage = useRef<string | null>(pathname);
	useEffect(() => {
		onPage.current = pathname;
		return () => {
			onPage.current = null;
		};
	}, [pathname]);

	// Re-read only when this grid's own parameters change: MUI X treats a new sort or filter
	// object as a change and sends the reader back to the first page
	const raw = ownSearch(grid, search);
	const view = useMemo(() => {
		const [values, group] = JSON.parse(raw) as [unknown[], unknown];
		const source: Search = Object.fromEntries(
			VIEW_PARAMS.map((param, index) => [paramName(param, namespace), values[index] ?? undefined]),
		);
		if (namespace && group !== null) source[namespace] = group;
		return readView(rules, source, namespace);
	}, [raw, rules, namespace]);

	const hidden = useLocation({ select: (location) => location.state.gridPrivate?.[id] });
	const restored = useLocation({
		select: (location) => location.state.gridRestored?.[id] === true,
	});

	// Each model keyed on its own part's text, so paging does not hand MUI X a "new" filter
	const filterPart = JSON.stringify([view.filters, view.logic ?? null]);
	const appliedFilter = useMemo(() => {
		const [filters, logic] = JSON.parse(filterPart) as [UrlView["filters"], "or" | null];
		return filterFromView(
			rules,
			{ filters, logic: logic ?? undefined },
			parsePrivateState(rules, hidden),
		);
	}, [rules, filterPart, hidden]);
	const sortPart = JSON.stringify(view.sort ?? null);
	const appliedSort = useMemo(
		() =>
			sortFromView(grid, rules, (JSON.parse(sortPart) as UrlView["sort"] | null) ?? undefined),
		[grid, rules, sortPart],
	);
	const { page, pageSize } = view;
	const appliedPagination = useMemo(
		() => paginationFromView(grid, { page, pageSize }, MAX_PAGE),
		[grid, page, pageSize],
	);
	const columnPart = JSON.stringify([view.hide, view.show]);
	const appliedVisibility = useMemo(() => {
		const [hide, show] = JSON.parse(columnPart) as [string[], string[]];
		return visibilityFromView(grid, rules, { hide, show });
	}, [grid, rules, columnPart]);
	const pinPart = JSON.stringify([view.pinLeft ?? [], view.pinRight ?? []]);
	const appliedPinned = useMemo(() => {
		const [pinLeft, pinRight] = JSON.parse(pinPart) as [string[], string[]];
		return pinnedFromView(rules, { pinLeft, pinRight });
	}, [rules, pinPart]);
	const orderPart = JSON.stringify(view.order ?? []);
	const appliedOrder = useMemo(
		() => orderFromView(rules, JSON.parse(orderPart) as string[]),
		[rules, orderPart],
	);

	// What the reader just did, shown until somebody else moves the address. A navigation
	// commits a tick later, and MUI X resets the page on a sort or filter prop it sees late.
	const [pending, setPending] = useState<Partial<GridModels>>({});
	const shown: GridModels = {
		filterModel: pending.filterModel ?? appliedFilter,
		sortModel: pending.sortModel ?? appliedSort,
		paginationModel: pending.paginationModel ?? appliedPagination,
		columnVisibilityModel: pending.columnVisibilityModel ?? appliedVisibility,
		pinnedColumns: pending.pinnedColumns ?? appliedPinned,
		columnOrder: pending.columnOrder ?? appliedOrder,
	};
	const shownRef = useRef(shown);
	useEffect(() => {
		shownRef.current = shown;
	});

	// Marks on this grid's own writes; an entry without one is the address changing under it
	const ownWrites = useRef<string[]>([]);
	const writeCount = useRef(0);
	const mountMark = useId();
	// One push per visit: the first change adds the entry Back returns from; the rest replace it
	const pushed = useRef(false);

	const nextMark = useCallback(() => {
		const mark = `${mountMark}${++writeCount.current}`;
		ownWrites.current = [...ownWrites.current.slice(-19), mark];
		return mark;
	}, [mountMark]);

	// In order: a change made while the visit's first push is under way must not overtake it
	const queue = useRef<Promise<unknown>>(Promise.resolve());

	const writeNow = useCallback(
		async (
			part: Partial<UrlView>,
			params: readonly ViewParam[],
			privateState?: PrivateGridState | null,
		) => {
			// "." resolves against wherever the reader is now
			if (router.state.location.pathname !== onPage.current) return undefined;
			// MUI reports some changes it made itself, such as page 1 again after a filter: a write that
			// changes nothing is not the reader's, and must not spend the visit's one push
			const encodedPart = encodeView({ ...emptyView(), ...part }, namespace);
			const current = router.state.location.search as Search;
			// One repeated value reads back as a plain string
			const asRead = (value: unknown) =>
				JSON.stringify((Array.isArray(value) && value.length === 1 ? value[0] : value) ?? null);
			const unchanged = params.every(
				(param) =>
					asRead(current[paramName(param, namespace)]) ===
					asRead(encodedPart[paramName(param, namespace)]),
			);
			if (unchanged && privateState === undefined) return undefined;
			const replace = pushed.current;
			pushed.current = true;
			if (!replace) {
				// The entry Back returns to keeps the view it arrived with: marked as this grid's,
				// it is not taken for a bare address and given the last view in its place
				const arrival = nextMark();
				await navigate({
					to: ".",
					search: (previous: Search) => previous,
					replace: true,
					resetScroll: false,
					state: (previous) => ({
						...previous,
						gridWrites: { ...previous.gridWrites, [id]: arrival },
					}),
				});
			}
			if (router.state.location.pathname !== onPage.current) return undefined;
			const mark = nextMark();
			const encoded = encodeView({ ...emptyView(), ...part }, namespace);
			return navigate({
				to: ".",
				search: (previous: Search) => {
					const next = { ...previous };
					// An old link's group is read once; what is written is the readable form
					if (namespace) delete next[namespace];
					for (const param of params) {
						const key = paramName(param, namespace);
						next[key] = encoded[key];
					}
					return next;
				},
				replace,
				resetScroll: false,
				state: (previous) => ({
					...previous,
					gridWrites: { ...previous.gridWrites, [id]: mark },
					gridRestored: { ...previous.gridRestored, [id]: undefined },
					...(privateState === undefined
						? {}
						: { gridPrivate: { ...previous.gridPrivate, [id]: privateState ?? undefined } }),
				}),
			});
		},
		[id, namespace, nextMark, navigate, router],
	);

	const write = useCallback(
		(part: Partial<UrlView>, params: readonly ViewParam[], privateState?: PrivateGridState | null) => {
			const next = queue.current.then(() => writeNow(part, params, privateState));
			queue.current = next.catch(() => undefined);
			return next;
		},
		[writeNow],
	);

	// Rule 1: only the reader's own changes reach the remembered view, never a view a link opened
	const rememberView = useRememberedViewStore((state) => state.remember);
	const forgetView = useRememberedViewStore((state) => state.forget);
	const remember = useCallback(
		(change: Partial<GridModels>) => {
			if (!grid.remember) return;
			const { view: next } = modelsToView(grid, rules, { ...shownRef.current, ...change });
			rememberView(id, next);
		},
		[grid, rules, id, rememberView],
	);

	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const unwritten = useRef<GridFilterModel | null>(null);
	useEffect(() => () => clearTimeout(timer.current), []);

	const entry = useLocation({ select: (location) => location.state.__TSR_key });
	const entryMark = useLocation({ select: (location) => location.state.gridWrites?.[id] });
	// Back, Forward or a link is a new visit, decided while rendering so the grid never sees it under
	// the last visit's models; the grid remounts on it, as MUI X answers a sort or filter prop with page 1
	const [visit, setVisit] = useState({ entry, count: 0 });
	if (visit.entry !== entry) {
		const own = entryMark !== undefined && ownWrites.current.includes(entryMark);
		setVisit({ entry, count: own ? visit.count : visit.count + 1 });
		if (!own) setPending((current) => (Object.keys(current).length > 0 ? {} : current));
	}
	useEffect(() => {
		const own = entryMark === undefined ? -1 : ownWrites.current.indexOf(entryMark);
		if (own >= 0) ownWrites.current = ownWrites.current.slice(own + 1);
	}, [entry, entryMark]);
	const seenVisit = useRef(visit.count);
	useEffect(() => {
		if (visit.count === seenVisit.current) return;
		seenVisit.current = visit.count;
		// A filter still being typed was for the view that left
		pushed.current = false;
		clearTimeout(timer.current);
		unwritten.current = null;
	}, [visit.count]);

	const appliedFilterKey = filterKey(grid, appliedFilter);
	const appliedFilterKeyRef = useRef(appliedFilterKey);
	useEffect(() => {
		appliedFilterKeyRef.current = appliedFilterKey;
	}, [appliedFilterKey]);

	const writeFilter = useCallback(
		(model: GridFilterModel) => {
			unwritten.current = null;
			// An unfinished row changes nothing the URL carries: not a change of the reader's, so
			// neither written nor remembered, or opening a link's filter panel would keep its view
			if (filterKey(grid, model) === appliedFilterKeyRef.current) return Promise.resolve();
			// A changed filter starts on its first page, in the same write: paging inside the
			// debounce would otherwise carry over to the new filter
			setPending((current) => {
				const next = { ...current };
				delete next.paginationModel;
				return next;
			});
			const { filters, logic, privateState } = filterToView(rules, model);
			remember({ filterModel: model });
			return write({ filters, logic }, [...FILTER_PARAMS, "page"], privateState ?? null);
		},
		[grid, rules, remember, write],
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setPending((current) => ({ ...current, filterModel: model }));
			clearTimeout(timer.current);
			unwritten.current = model;
			timer.current = setTimeout(() => void writeFilter(model), FILTER_DEBOUNCE_MS);
		},
		[writeFilter],
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			// The first page of the new order in one write, not this page and then page 1
			const paginationModel = { page: 0, pageSize: shownRef.current.paginationModel.pageSize };
			setPending((current) => ({ ...current, sortModel: model, paginationModel }));
			remember({ sortModel: model });
			void write({ sort: sortToView(grid, rules, model) }, [...SORT_PARAMS, "page"]);
		},
		[grid, rules, remember, write],
	);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			const sizeChanged = model.pageSize !== shownRef.current.paginationModel.pageSize;
			setPending((current) => ({ ...current, paginationModel: model }));
			// The page itself is never remembered
			if (sizeChanged) remember({ paginationModel: model });
			void write(paginationToView(grid, model), PAGE_PARAMS);
		},
		[grid, remember, write],
	);

	const handlePinnedColumnsChange = useCallback(
		(model: GridPinnedColumnFields) => {
			setPending((current) => ({ ...current, pinnedColumns: model }));
			remember({ pinnedColumns: model });
			void write(pinnedToView(rules, model), PIN_PARAMS);
		},
		[rules, remember, write],
	);

	const handleColumnOrderChange = useCallback(
		(unpinned: string[]) => {
			// Pinned columns keep their default places in the order: pinning alone is not a reorder
			const { left = [], right = [] } = shownRef.current.pinnedColumns;
			const pinned = new Set([...left, ...right]);
			const moved = orderFromView(rules, unpinned).filter((field) => !pinned.has(field));
			let next = 0;
			const columnOrder = rules.order.map((field) => (pinned.has(field) ? field : moved[next++]));
			setPending((current) => ({ ...current, columnOrder }));
			remember({ columnOrder });
			void write({ order: orderToView(rules, columnOrder) }, ORDER_PARAMS);
		},
		[rules, remember, write],
	);

	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) => {
			setPending((current) => ({ ...current, columnVisibilityModel: model }));
			remember({ columnVisibilityModel: model });
			void write(visibilityToView(grid, rules, model), COLUMN_PARAMS);
		},
		[grid, rules, remember, write],
	);

	const apply = useCallback(
		(saved: SavedFilterSearch) => {
			clearTimeout(timer.current);
			unwritten.current = null;
			const filterModel = filterFromView(rules, saved);
			const sortModel = sortFromView(grid, rules, saved.sort);
			const paginationModel = { page: 0, pageSize: shownRef.current.paginationModel.pageSize };
			// Shown at once, as the reader's own changes are: the URL commits a tick later
			setPending((current) => ({ ...current, filterModel, sortModel, paginationModel }));
			remember({ filterModel, sortModel });
			void write(
				{ filters: saved.filters, logic: saved.logic, sort: sortToView(grid, rules, sortModel) },
				[...FILTER_PARAMS, ...SORT_PARAMS, "page"],
				null,
			);
		},
		[grid, rules, remember, write],
	);
	const resetFilterAndSort = useCallback(() => apply({ filters: [] }), [apply]);

	const resetView = useCallback(() => {
		clearTimeout(timer.current);
		unwritten.current = null;
		forgetView(id);
		setPending({
			filterModel: filterFromView(rules, emptyView()),
			sortModel: grid.defaultSort,
			paginationModel: paginationFromView(grid, emptyView(), MAX_PAGE),
			columnVisibilityModel: visibilityFromView(grid, rules, emptyView()),
			pinnedColumns: pinnedFromView(rules, emptyView()),
			columnOrder: orderFromView(rules, undefined),
		});
		void write(emptyView(), VIEW_PARAMS, null);
	}, [grid, rules, id, forgetView, write]);

	const flush = useCallback(async () => {
		if (!unwritten.current) return;
		clearTimeout(timer.current);
		await writeFilter(unwritten.current);
	}, [writeFilter]);

	const shownFilter = shown.filterModel;
	const shownSort = shown.sortModel;
	const views = useMemo((): GridViews => {
		const { filters, logic, privateState } = filterToView(rules, shownFilter);
		const sort = sortToView(grid, rules, shownSort);
		const current: SavedFilterSearch = { filters };
		if (logic) current.logic = logic;
		if (sort) current.sort = sort;
		return {
			gridId: id,
			current,
			hasPrivate: privateState !== undefined,
			restored,
			flush,
			apply,
			reset: resetFilterAndSort,
			resetView,
			sanitise: (saved) => savedSearchOf(rules, saved),
			toFilterModel: (saved) => filterFromView(rules, saved),
		};
	}, [grid, rules, id, shownFilter, shownSort, restored, flush, apply, resetFilterAndSort, resetView]);

	const appliedFilterModel = appliedFilter;
	return {
		/** What the grid shows: the filter as typed, before the debounce. */
		filterModel: shown.filterModel,
		/** What the server is asked for, and what an export or reset reads. */
		appliedFilterModel,
		sortModel: shown.sortModel,
		paginationModel: shown.paginationModel,
		columnVisibilityModel: shown.columnVisibilityModel,
		/** Pinning and order, for DataGrid's columnLayout. */
		columnLayout: {
			pinnedColumns: shown.pinnedColumns,
			onPinnedColumnsChange: handlePinnedColumnsChange,
			columnOrder: shown.columnOrder,
			onColumnOrderChange: handleColumnOrderChange,
			visit: visit.count,
		} satisfies ColumnLayout,
		// Any change the server has not answered yet, a removal included
		isFiltering:
			pending.filterModel !== undefined && filterKey(grid, pending.filterModel) !== appliedFilterKey,
		/** Whether the reader narrowed the grid, so there is something to reset. */
		isNarrowed:
			appliedFilterModel.items.length > 0 ||
			(appliedFilterModel.quickFilterValues?.length ?? 0) > 0 ||
			sortToView(grid, rules, appliedSort) !== undefined,
		handleFilterChange,
		handleSortChange,
		handlePaginationChange,
		handleColumnVisibilityChange,
		resetFilterAndSort,
		views,
	};
};

export type SyncedDataGrid = ReturnType<typeof useSyncedDataGrid>;
