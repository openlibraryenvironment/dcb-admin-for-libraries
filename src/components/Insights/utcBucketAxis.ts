import type { AxisValueFormatterContext } from "@mui/x-charts-pro";

import { formatUtcDate } from "@helpers/formatters";

/**
 * A time axis of dcb-service's buckets, which start at UTC midnight. On a "time" scale a
 * reader west of UTC saw each one labelled as the day, or month, before.
 */
export const utcBucketAxis = {
	scaleType: "utc" as const,
	valueFormatter: (value: Date, context: AxisValueFormatterContext) =>
		context.location === "tick" ? context.defaultTickLabel : formatUtcDate(value),
};
