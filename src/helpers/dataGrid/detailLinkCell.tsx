import type { ReactNode } from "react";
import type { GridRenderCellParams } from "@mui/x-data-grid-premium";

// The grid's onRowClick is a POINTER affordance. A keyboard user focusing a cell
// and pressing Enter reaches nothing, so without a link in the row the detail
// pages are unreachable without a mouse - WCAG 2.1.1.
//
// A link also buys ctrl-click, the browser's own "open in new tab" and an entry
// in a screen reader's link list, none of which an onRowClick handler can give.

/**
 * Renders a cell's displayed value as the row's link to its detail page.
 *
 * `link` is supplied per column set so each one keeps the router's typed `to`
 * and `params`; a helper that took a path string would defeat that.
 *
 * Falls back to the plain value when a row carries no id, which the grid's own
 * loading and aggregation rows do.
 */
export const detailLinkCell = (
	params: GridRenderCellParams,
	link: (id: string, label: ReactNode) => ReactNode,
): ReactNode => {
	const label = params.formattedValue ?? params.value ?? "";
	const id = params.row?.id;
	return id ? link(String(id), label as ReactNode) : (label as ReactNode);
};
