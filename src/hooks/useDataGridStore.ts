import {
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
	GridColumnVisibilityModel,
} from "@mui/x-data-grid-premium";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { storageKey } from "@helpers/appBase";
import { clampPageSize } from "@constants/dataGrid/pagination";

// Persist all our grid options so we don't lose them on reload
interface GridState {
	// Sort model is stored directly for consistency
	sortModel: Record<string, GridSortModel>;
	// Only the filter model is needed; the string is derived from it
	filterModel: Record<string, GridFilterModel>;
	paginationModel: Record<string, GridPaginationModel>;
	columnVisibilityModel: Record<string, GridColumnVisibilityModel>;
}

interface GridActions {
	setSortModel: (gridType: string, model: GridSortModel) => void;
	setFilterModel: (gridType: string, model: GridFilterModel) => void;
	setPaginationModel: (gridType: string, model: GridPaginationModel) => void;
	setColumnVisibilityModel: (
		gridType: string,
		model: GridColumnVisibilityModel
	) => void;
	clearGridState: () => void;
}

export const useGridStore = create<GridState & GridActions>()(
	persist(
		(set) => ({
			sortModel: {},
			filterModel: {},
			paginationModel: {},
			columnVisibilityModel: {},

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

			setColumnVisibilityModel: (gridType, model) =>
				set((state) => ({
					columnVisibilityModel: {
						...state.columnVisibilityModel,
						[gridType]: model,
					},
				})),

			clearGridState: () =>
				set(() => ({
					sortModel: {},
					filterModel: {},
					paginationModel: {},
					columnVisibilityModel: {},
				})),
		}),
		{
			// Namespaced: DCB Admin persists a store under the same bare
			// "grid-storage" key in the same sessionStorage, with a different shape.
			// On a shared origin the two collide and hydration can throw.
			name: storageKey("grid-storage"),
			storage: createJSONStorage(() => sessionStorage), // or localStorage
			/**
			 * A page size this build no longer offers survives in sessionStorage
			 * across the deployment that removed it (200 was on the list until the
			 * 100-row bound was applied), and MUI X does not clamp a
			 * paginationModel to its pageSizeOptions.
			 */
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<GridState>;
				const paginationModel = Object.fromEntries(
					Object.entries(stored.paginationModel ?? {}).map(([grid, model]) => [
						grid,
						{ ...model, pageSize: clampPageSize(model?.pageSize) },
					]),
				);
				return { ...current, ...stored, paginationModel };
			},
		}
	)
);
