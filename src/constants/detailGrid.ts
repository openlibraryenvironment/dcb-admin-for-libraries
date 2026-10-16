import type { SxProps, Theme } from "@mui/material";

/** The column count of a record detail page's Grid, per breakpoint. */
export const DETAIL_COLUMNS = { xs: 3, sm: 6, md: 9, lg: 12 } as const;

/**
 * A heading or divider spanning the whole row. Must equal DETAIL_COLUMNS: an
 * item's width is size / columns, so the 4/8/12/16 these pages used rendered at
 * 133% of the container and pushed the page sideways.
 */
export const FULL_ROW = DETAIL_COLUMNS;

/**
 * One attribute: the whole row on a phone, two to a row from sm and three from md. Sized
 * against DETAIL_COLUMNS - 2/4/4, written for a 4/8/12 grid, left a third of every row empty.
 */
export const DETAIL_ITEM = { xs: 3, sm: 3, md: 3, lg: 4 } as const;

/** A record's raw JSON, wrapped rather than scrolling the page sideways. */
export const WRAPPED_PRE: SxProps<Theme> = {
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
};
