import type { RouteGridSearch } from "@helpers/dataGrid/gridSearchSchema";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";

import { useGridStore } from "@/hooks/useDataGridStore";
import type { SavedFilterSearch } from "@helpers/savedFilters";
import {
	filterToSearch,
	GridDefinition,
	GridModels,
	GridSearch,
	hasDraftItems,
	paginationToSearch,
	PrivateGridState,
	readFilter,
	readSort,
	savedSearchOf,
	sortToSearch,
} from "@helpers/dataGrid/gridSearch";

declare module "@tanstack/react-router" {
	interface HistoryState {
		/** Per grid id: the filter values a URL must not carry. docs/routing.md. */
		grids?: Record<string, PrivateGridState | undefined>;
		/** Per grid id: the mark of the grid's own last write, to tell it from Back or a link. */
		gridWrites?: Record<string, string>;
	}
}

const FILTER_DEBOUNCE_MS = 500;

/** What the toolbar needs to share the grid's view as a link and to save it. */
export interface GridViews {
	gridId: string;
	/** The filter and sort as the grid shows them, as the URL will hold them. */
	current: SavedFilterSearch;
	/** A barcode filter or search text narrows the grid: neither goes in a link or a saved filter. */
	hasPrivate: boolean;
	/** Writes a filter still waiting on the debounce, so the address is the grid as shown. */
	flush: () => Promise<void>;
	apply: (search: SavedFilterSearch) => void;
	/** Back to the grid's own filter, sort and first page: the bare address. */
	reset: () => void;
	/** A stored search through this grid's allow-list, as a URL is. */
	sanitise: (search: unknown) => SavedFilterSearch;
}

type Search = Record<string, unknown>;

const isBlank = (part: Search) =>
	Object.values(part).every((value) => value === undefined);

/** Each model as the URL will hold it, so a pending one can be matched to its arrival. */
const settledKeys = {
	filterModel: (grid: GridDefinition, model: GridFilterModel) =>
		JSON.stringify(filterToSearch(grid, model)),
	sortModel: (grid: GridDefinition, model: GridSortModel) =>
		JSON.stringify(sortToSearch(grid, model)),
	paginationModel: (grid: GridDefinition, model: GridPaginationModel) =>
		JSON.stringify(paginationToSearch(grid, model)),
};

interface Pending extends Partial<GridModels> {
	/** The debounce has fired: until then a half-typed value must not be matched away. */
	filterWritten?: boolean;
}

const withoutSettled = (
	grid: GridDefinition,
	pending: Pending,
	applied: GridModels,
): Pending => {
	const next = { ...pending };
	if (
		next.filterModel &&
		next.filterWritten &&
		// A row the URL cannot carry yet stays on screen until it is finished or removed
		!hasDraftItems(grid, next.filterModel) &&
		settledKeys.filterModel(grid, next.filterModel) ===
			settledKeys.filterModel(grid, applied.filterModel)
	) {
		delete next.filterModel;
		delete next.filterWritten;
	}
	if (
		next.sortModel &&
		settledKeys.sortModel(grid, next.sortModel) ===
			settledKeys.sortModel(grid, applied.sortModel)
	)
		delete next.sortModel;
	if (
		next.paginationModel &&
		settledKeys.paginationModel(grid, next.paginationModel) ===
			settledKeys.paginationModel(grid, applied.paginationModel)
	)
		delete next.paginationModel;
	return Object.keys(next).length === Object.keys(pending).length
		? pending
		: next;
};

/**
 * A server-paged grid's filter, sort and page, read from and written to its
 * route's search; column visibility is a device preference, in the store.
 * docs/routing.md says how to add a grid.
 */
export const useSyncedDataGrid = (
	grid: GridDefinition,
	search: RouteGridSearch | undefined,
) => {
	const navigate = useNavigate();
	const hidden = useLocation({
		select: (location) => location.state.grids?.[grid.id],
	});
	// One memo per model, keyed on its own search values (which the router
	// shares structurally): MUI X treats a new sort or filter object as a change
	// and sends the reader back to the first page.
	const filters = search?.filters;
	const logic = search?.logic;
	const sort = search?.sort;
	const page = search?.page;
	const pageSize = search?.pageSize;
	const filterModel = useMemo(
		() => readFilter(grid, { filters, logic }, hidden),
		[grid, filters, logic, hidden],
	);
	const sortModel = useMemo(() => readSort(grid, sort), [grid, sort]);
	const paginationModel = useMemo(
		() => ({ page: page ?? 0, pageSize: pageSize ?? grid.defaultPageSize }),
		[grid, page, pageSize],
	);
	const applied: GridModels = { filterModel, sortModel, paginationModel };

	// What the reader just did, shown until the URL catches up. A navigation
	// commits a tick later, and MUI X resets the page on a sort or filter prop
	// change it sees late, so the grid must not wait for the URL.
	const [pending, setPending] = useState<Pending>({});
	const unsettled = withoutSettled(grid, pending, applied);
	if (unsettled !== pending) setPending(unsettled);
	const shown: GridModels = {
		filterModel: unsettled.filterModel ?? applied.filterModel,
		sortModel: unsettled.sortModel ?? applied.sortModel,
		paginationModel: unsettled.paginationModel ?? applied.paginationModel,
	};

	// Marks on this grid's own writes; an entry without one is the address changing under it
	const ownWrites = useRef<string[]>([]);
	const writeCount = useRef(0);
	const mountMark = useId();

	const write = useCallback(
		(part: Partial<GridSearch>, privateState?: PrivateGridState | null) => {
			const mark = `${mountMark}${++writeCount.current}`;
			ownWrites.current = [...ownWrites.current.slice(-19), mark];
			return navigate({
				to: ".",
				search: (previous: Search) => {
					if (!grid.searchKey) return { ...previous, ...part };
					const own = {
						...(previous[grid.searchKey] as Search | undefined),
						...part,
					};
					return { ...previous, [grid.searchKey]: isBlank(own) ? undefined : own };
				},
				// Replaced, not pushed: typing and paging would otherwise flood history.
				replace: true,
				resetScroll: false,
				state: (previous) => ({
					...previous,
					gridWrites: { ...previous.gridWrites, [grid.id]: mark },
					...(privateState === undefined
						? {}
						: { grids: { ...previous.grids, [grid.id]: privateState ?? undefined } }),
				}),
			});
		},
		[grid, mountMark, navigate],
	);

	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const unwritten = useRef<GridFilterModel | null>(null);
	useEffect(() => () => clearTimeout(timer.current), []);

	const entry = useLocation({ select: (location) => location.state.__TSR_key });
	const entryMark = useLocation({ select: (location) => location.state.gridWrites?.[grid.id] });
	const seenEntry = useRef(entry);
	useEffect(() => {
		if (entry === seenEntry.current) return;
		seenEntry.current = entry;
		const own = entryMark === undefined ? -1 : ownWrites.current.indexOf(entryMark);
		if (own >= 0) {
			ownWrites.current = ownWrites.current.slice(own + 1);
			return;
		}
		// Back, forward or a link: a filter still being typed was for the view that left
		clearTimeout(timer.current);
		unwritten.current = null;
		setPending((current) => (Object.keys(current).length > 0 ? {} : current));
	}, [entry, entryMark]);

	const appliedFilterKey = settledKeys.filterModel(grid, applied.filterModel);
	const appliedFilterKeyRef = useRef(appliedFilterKey);
	useEffect(() => {
		appliedFilterKeyRef.current = appliedFilterKey;
	}, [appliedFilterKey]);

	const writeFilter = useCallback(
		(model: GridFilterModel) => {
			unwritten.current = null;
			// A changed filter starts on its first page, in the same write: paging inside
			// the debounce would otherwise carry over to the new filter
			const resetsPage = settledKeys.filterModel(grid, model) !== appliedFilterKeyRef.current;
			setPending((current) => {
				const next: Pending =
					current.filterModel === model ? { ...current, filterWritten: true } : { ...current };
				if (resetsPage) delete next.paginationModel;
				return next;
			});
			const { search: part, state } = filterToSearch(grid, model);
			return write(resetsPage ? { ...part, page: undefined } : part, state ?? null);
		},
		[grid, write],
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setPending((current) => ({
				...current,
				filterModel: model,
				filterWritten: false,
			}));
			clearTimeout(timer.current);
			unwritten.current = model;
			timer.current = setTimeout(() => void writeFilter(model), FILTER_DEBOUNCE_MS);
		},
		[writeFilter],
	);

	const pageSizeShown = shown.paginationModel.pageSize;
	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			// The first page of the new order in one write, not this page and then page 0
			setPending((current) => ({
				...current,
				sortModel: model,
				paginationModel: { page: 0, pageSize: pageSizeShown },
			}));
			void write({ ...sortToSearch(grid, model), page: undefined });
		},
		[grid, pageSizeShown, write],
	);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setPending((current) => ({ ...current, paginationModel: model }));
			void write(paginationToSearch(grid, model));
		},
		[grid, write],
	);

	const applySearch = useCallback(
		(search: SavedFilterSearch) => {
			clearTimeout(timer.current);
			unwritten.current = null;
			// Shown at once, as the reader's own changes are: the URL commits a tick later
			setPending({
				filterModel: readFilter(grid, search, undefined),
				filterWritten: true,
				sortModel: readSort(grid, search.sort),
				paginationModel: { page: 0, pageSize: pageSizeShown },
			});
			void write(
				{ filters: search.filters, logic: search.logic, sort: search.sort, page: undefined },
				null,
			);
		},
		[grid, pageSizeShown, write],
	);
	const resetFilterAndSort = useCallback(
		() => applySearch({ filters: undefined, logic: undefined, sort: undefined }),
		[applySearch],
	);

	const shownFilter = shown.filterModel;
	const shownSort = shown.sortModel;
	const views = useMemo((): GridViews => {
		const filter = filterToSearch(grid, shownFilter);
		return {
			gridId: grid.id,
			current: { ...filter.search, ...sortToSearch(grid, shownSort) },
			hasPrivate: filter.state !== undefined,
			flush: async () => {
				if (!unwritten.current) return;
				clearTimeout(timer.current);
				await writeFilter(unwritten.current);
			},
			apply: applySearch,
			reset: resetFilterAndSort,
			sanitise: (search) => savedSearchOf(grid, search),
		};
	}, [grid, shownFilter, shownSort, applySearch, resetFilterAndSort, writeFilter]);

	const columnVisibilityModel =
		useGridStore((state) => state.columnVisibilityModel[grid.id]) ??
		grid.defaultColumnVisibility;
	const setColumnVisibilityModel = useGridStore(
		(state) => state.setColumnVisibilityModel,
	);
	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) =>
			setColumnVisibilityModel(grid.id, model),
		[grid.id, setColumnVisibilityModel],
	);

	const appliedFilterModel = applied.filterModel;
	return {
		/** What the grid shows: the filter as typed, before the debounce. */
		filterModel: shown.filterModel,
		/** What the server is asked for, and what an export or reset reads. */
		appliedFilterModel,
		sortModel: shown.sortModel,
		paginationModel: shown.paginationModel,
		columnVisibilityModel,
		// Any change the server has not answered yet, a removal included
		isFiltering:
			unsettled.filterModel !== undefined &&
			settledKeys.filterModel(grid, unsettled.filterModel) !== appliedFilterKey,
		/** Whether the reader narrowed the grid, so there is something to reset. */
		isNarrowed:
			appliedFilterModel.items.length > 0 ||
			(appliedFilterModel.quickFilterValues?.length ?? 0) > 0 ||
			settledKeys.sortModel(grid, applied.sortModel) !==
				settledKeys.sortModel(grid, grid.defaultSort),
		handleFilterChange,
		handleSortChange,
		handlePaginationChange,
		handleColumnVisibilityChange,
		resetFilterAndSort,
		views,
	};
};

export type SyncedDataGrid = ReturnType<typeof useSyncedDataGrid>;
