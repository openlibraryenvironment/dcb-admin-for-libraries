import type { ParsedLocation } from "@tanstack/react-router";

import { rememberedView } from "@/hooks/rememberedViewStore";
import type { GridViewId } from "./gridViewIds";
import type { PrivateGridState } from "./gridView";
import { encodeView, paramName, VIEW_PARAMS } from "./urlViewCodec";

// For a grid route's options outside its component, which load eagerly: nothing here may import
// MUI X at run time. docs/url-view-state.md.

declare module "@tanstack/react-router" {
	interface HistoryState {
		/** Per grid id: the filter values a URL must not carry. */
		gridPrivate?: Record<string, PrivateGridState | undefined>;
		/** Per grid id: the mark of the grid's own last write, to tell it from Back or a link. */
		gridWrites?: Record<string, string>;
		/** Per grid id: the view came from the reader's last one, not from the link. */
		gridRestored?: Record<string, true | undefined>;
	}
}

export type HistoryEntryState = ParsedLocation["state"];

const VIEW_PARAM_KEY = new RegExp(`^([a-z][A-Za-z0-9]*\\.)?(${VIEW_PARAMS.join("|")})$`);

/**
 * Where a bare URL should go instead: the reader's last view of this grid, written into the
 * address. For the route's `beforeLoad`, so the defaults are neither shown nor fetched first.
 */
export const rememberedViewRedirect = (
	grid: GridViewId,
	search: Record<string, unknown>,
	state: HistoryEntryState,
) => {
	if (!grid.remember) return undefined;
	// The grid wrote this entry itself, a Reset among them, or it holds a private filter
	if (state.gridWrites?.[grid.id] || state.gridPrivate?.[grid.id]) return undefined;
	const own = new Set(VIEW_PARAMS.map((param) => paramName(param, grid.namespace)));
	const linked = Object.entries(search).some(
		([key, value]) => value !== undefined && (own.has(key) || !VIEW_PARAM_KEY.test(key)),
	);
	if (linked) return undefined;
	const view = rememberedView(grid.id);
	if (!view) return undefined;
	return {
		search: { ...search, ...encodeView(view, grid.namespace) },
		replace: true,
		state: (previous: HistoryEntryState) => ({
			...previous,
			gridRestored: { ...previous.gridRestored, [grid.id]: true as const },
		}),
	};
};
