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

/**
 * Column visibility is a device preference, persisted. Filter, sort and page
 * here belong to the client-paged grids only and last for the session in
 * memory: a server-paged grid keeps them in its URL (docs/routing.md).
 */
interface GridState {
	sortModel: Record<string, GridSortModel>;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

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
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				columnVisibilityModel: state.columnVisibilityModel,
			}),
			// An earlier build persisted filter, sort and page as well; only the
			// visibility is read back, so an old session's filters do not return.
			merge: (persisted, current) => {
				const stored = isRecord(persisted) ? persisted : {};
				return {
					...current,
					columnVisibilityModel: isRecord(stored.columnVisibilityModel)
						? (stored.columnVisibilityModel as GridState["columnVisibilityModel"])
						: {},
				};
			},
		}
	)
);
