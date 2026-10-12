import type { SxProps, Theme } from "@mui/material";

/** The column count of a record detail page's Grid, per breakpoint. */
export const DETAIL_COLUMNS = { xs: 3, sm: 6, md: 9, lg: 12 } as const;

/**
 * A heading or divider spanning the whole row. Must equal DETAIL_COLUMNS: an
 * item's width is size / columns, so the 4/8/12/16 these pages used rendered at
 * 133% of the container and pushed the page sideways.
 */
export const FULL_ROW = DETAIL_COLUMNS;

/** A record's raw JSON, wrapped rather than scrolling the page sideways. */
export const WRAPPED_PRE: SxProps<Theme> = {
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
};
