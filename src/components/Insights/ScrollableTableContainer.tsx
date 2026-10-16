import TableContainer, { type TableContainerProps } from "@mui/material/TableContainer";

/**
 * A panel's table, focusable: at narrow widths it scrolls, and a keyboard must be able to
 * reach what is scrolled out of view. WCAG 2.1.1. Named by the element `labelledBy` names.
 */
export default function ScrollableTableContainer({
	labelledBy,
	...props
}: TableContainerProps & { labelledBy: string }) {
	return <TableContainer tabIndex={0} role="group" aria-labelledby={labelledBy} {...props} />;
}
