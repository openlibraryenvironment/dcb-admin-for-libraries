import { queryOptions } from "@tanstack/react-query";

import { storageKey } from "@helpers/appBase";
import type { GridSearch } from "@helpers/dataGrid/gridSearch";
import { queryKeys } from "@helpers/queryKeys";

/** What a saved filter restores: a grid's filter and sort, never its page. */
export type SavedFilterSearch = Pick<GridSearch, "filters" | "logic" | "sort">;

export interface SavedFilter {
	id: string;
	name: string;
	search: SavedFilterSearch;
	savedAt: string;
}

/**
 * Where saved filters live. Async because the user-preferences store that replaces the
 * session one is a server: docs/saved-filters.md lists what changes when it does.
 */
export interface SavedFilterStore {
	list: (gridId: string) => Promise<SavedFilter[]>;
	/** Replaces a filter of the same name, ignoring case. */
	save: (gridId: string, name: string, search: SavedFilterSearch) => Promise<SavedFilter>;
	remove: (gridId: string, id: string) => Promise<void>;
}

export const MAX_SAVED_FILTERS = 20;
export const MAX_SAVED_FILTER_NAME = 60;

export class SavedFilterLimitError extends Error {}

const PREFIX = "savedFilters:";
const keyOf = (gridId: string) => storageKey(`${PREFIX}${gridId}`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isSavedFilter = (value: unknown): value is SavedFilter =>
	isRecord(value) &&
	typeof value.id === "string" &&
	value.id.length <= 64 &&
	typeof value.name === "string" &&
	value.name.length > 0 &&
	value.name.length <= MAX_SAVED_FILTER_NAME &&
	typeof value.savedAt === "string" &&
	isRecord(value.search);

// Storage is read back from the browser, so it is checked like a URL; each search is
// checked again against its grid's allow-list before it is shown or applied
const read = (gridId: string): SavedFilter[] => {
	try {
		const raw: unknown = JSON.parse(sessionStorage.getItem(keyOf(gridId)) ?? "[]");
		return Array.isArray(raw) ? raw.filter(isSavedFilter).slice(0, MAX_SAVED_FILTERS) : [];
	} catch {
		return [];
	}
};

const write = (gridId: string, filters: SavedFilter[]) =>
	sessionStorage.setItem(keyOf(gridId), JSON.stringify(filters));

/** Per tab, gone when the tab closes or its user signs out. */
export const sessionSavedFilterStore: SavedFilterStore = {
	list: async (gridId) => read(gridId),
	save: async (gridId, name, search) => {
		const saved: SavedFilter = {
			id: crypto.randomUUID(),
			name,
			search,
			savedAt: new Date().toISOString(),
		};
		const others = read(gridId).filter(
			(filter) => filter.name.toLocaleLowerCase() !== name.toLocaleLowerCase(),
		);
		if (others.length >= MAX_SAVED_FILTERS) throw new SavedFilterLimitError();
		write(gridId, [...others, saved]);
		return saved;
	},
	remove: async (gridId, id) => write(gridId, read(gridId).filter((filter) => filter.id !== id)),
};

/** The one place the store is chosen. */
export const savedFilterStore: SavedFilterStore = sessionSavedFilterStore;

/** Signing out on a shared machine leaves nobody's saved filters behind. */
export const clearSessionSavedFilters = (): void => {
	try {
		const prefix = storageKey(PREFIX);
		for (const key of Object.keys(sessionStorage)) {
			if (key.startsWith(prefix)) sessionStorage.removeItem(key);
		}
	} catch {
		// Blocked storage holds nothing to clear
	}
};

export const savedFiltersQueryOptions = (gridId: string) =>
	queryOptions({
		queryKey: queryKeys.savedFilters.list(gridId),
		queryFn: () => savedFilterStore.list(gridId),
		// Only this tab writes the session store, and every write invalidates this key
		staleTime: Infinity,
	});
