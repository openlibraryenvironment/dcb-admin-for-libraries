import {
	GridFilterModel,
	GridPaginationModel,
	GridSortModel,
	GridColumnVisibilityModel,
} from "@mui/x-data-grid-premium";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface GridState {
	// Sort model is stored directly for consistency
	sortModel: Record<string, GridSortModel>;
	// Only the filter model is needed; the string is derived from it
	filterModel: Record<string, GridFilterModel>;
	paginationModel: Record<string, GridPaginationModel>;
	columnVisibility: Record<string, GridColumnVisibilityModel>;
}

interface GridActions {
	setSortModel: (gridType: string, model: GridSortModel) => void;
	setFilterModel: (gridType: string, model: GridFilterModel) => void;
	setPaginationModel: (gridType: string, model: GridPaginationModel) => void;
	setColumnVisibility: (
		gridType: string,
		model: GridColumnVisibilityModel
	) => void;
	clearGridState: () => void;
}

// The store now uses the official MUI types directly
export const useGridStore = create<GridState & GridActions>()(
	persist(
		(set) => ({
			sortModel: {},
			filterModel: {},
			paginationModel: {},
			columnVisibility: {},

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
					paginationModel: { ...state.paginationModel, [gridType]: model },
				})),

			setColumnVisibility: (gridType, model) =>
				set((state) => ({
					columnVisibility: { ...state.columnVisibility, [gridType]: model },
				})),

			clearGridState: () =>
				set(() => ({
					sortModel: {},
					filterModel: {},
					paginationModel: {},
					columnVisibility: {},
				})),
		}),
		{
			name: "grid-storage",
			storage: createJSONStorage(() => sessionStorage), // or localStorage
		}
	)
);
