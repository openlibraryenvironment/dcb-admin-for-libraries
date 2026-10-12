import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";

import { useGridStore } from "@/hooks/useDataGridStore";
import { checkIfFiltering } from "@helpers/dataGrid/utilities";
import {
	filterToSearch,
	GridDefinition,
	GridModels,
	GridSearch,
	paginationToSearch,
	PrivateGridState,
	readFilter,
	readSort,
	sortToSearch,
} from "@helpers/dataGrid/gridSearch";

declare module "@tanstack/react-router" {
	interface HistoryState {
		/** Per grid id: the filter values a URL must not carry. docs/routing.md. */
		grids?: Record<string, PrivateGridState | undefined>;
	}
}

const FILTER_DEBOUNCE_MS = 500;

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
	search: GridSearch | undefined,
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

	const write = useCallback(
		(part: Partial<GridSearch>, privateState?: PrivateGridState | null) => {
			void navigate({
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
				state:
					privateState === undefined
						? true
						: (previous) => ({
								...previous,
								grids: {
									...previous.grids,
									[grid.id]: privateState ?? undefined,
								},
							}),
			});
		},
		[grid, navigate],
	);

	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setPending((current) => ({
				...current,
				filterModel: model,
				filterWritten: false,
			}));
			clearTimeout(timer.current);
			timer.current = setTimeout(() => {
				setPending((current) =>
					current.filterModel === model
						? { ...current, filterWritten: true }
						: current,
				);
				const { search: part, state } = filterToSearch(grid, model);
				write(part, state ?? null);
			}, FILTER_DEBOUNCE_MS);
		},
		[grid, write],
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			setPending((current) => ({ ...current, sortModel: model }));
			write(sortToSearch(grid, model));
		},
		[grid, write],
	);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setPending((current) => ({ ...current, paginationModel: model }));
			write(paginationToSearch(grid, model));
		},
		[grid, write],
	);

	const resetFilterAndSort = useCallback(() => {
		clearTimeout(timer.current);
		setPending({});
		write({ filters: undefined, logic: undefined, sort: undefined }, null);
	}, [write]);

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
		isFiltering:
			unsettled.filterModel !== undefined &&
			checkIfFiltering(unsettled.filterModel, appliedFilterModel),
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
	};
};

export type SyncedDataGrid = ReturnType<typeof useSyncedDataGrid>;
