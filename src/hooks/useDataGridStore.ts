import {
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
} from "@mui/x-data-grid-premium";
import { create } from "zustand";

import { clampPageSize } from "@constants/dataGrid/pagination";

/**
 * Filter, sort and page of the client-paged grids (record items, the cleanup dialog), in memory
 * for the session. A server-paged grid keeps its view in its URL: docs/url-view-state.md.
 */
interface GridState {
	sortModel: Record<string, GridSortModel>;
	filterModel: Record<string, GridFilterModel>;
	paginationModel: Record<string, GridPaginationModel>;
}

interface GridActions {
	setSortModel: (gridType: string, model: GridSortModel) => void;
	setFilterModel: (gridType: string, model: GridFilterModel) => void;
	setPaginationModel: (gridType: string, model: GridPaginationModel) => void;
	clearGridState: () => void;
}

export const useGridStore = create<GridState & GridActions>()((set) => ({
	sortModel: {},
	filterModel: {},
	paginationModel: {},

	setSortModel: (gridType, model) =>
		set((state) => ({
			sortModel: { ...state.sortModel, [gridType]: model },
		})),

	setFilterModel: (gridType, model) =>
		set((state) => ({
			filterModel: { ...state.filterModel, [gridType]: model },
		})),

	setPaginationModel: (gridType, model) =>
		set((state) => ({
			paginationModel: {
				...state.paginationModel,
				[gridType]: { ...model, pageSize: clampPageSize(model.pageSize) },
			},
		})),

	clearGridState: () =>
		set(() => ({
			sortModel: {},
			filterModel: {},
			paginationModel: {},
		})),
}));
