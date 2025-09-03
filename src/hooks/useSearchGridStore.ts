import { create } from "zustand";
import { SearchFilter } from "@models/SearchTypes";

// The filters for shared index search are a little different ...
interface FilterState {
	appliedFilters: SearchFilter[];
	setAppliedFilters: (filters: SearchFilter[]) => void;
}

export const useSearchGridStore = create<FilterState>((set) => ({
	appliedFilters: [],
	setAppliedFilters: (filters) => set({ appliedFilters: filters }),
}));
