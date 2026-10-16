import { z } from "zod";

import { MAX_PAGE, PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";

// The shape of a grid's URL state, and nothing that needs its columns. Route files load
// eagerly, so a schema built from column definitions put every grid's code on every page.
// Each grid narrows this to its own fields and operators in readFilter and readSort.

const MAX_FILTER_ITEMS = 20;

export const gridSearchSchema = z.object({
	page: z.number().int().min(0).max(MAX_PAGE).optional().catch(undefined),
	pageSize: z
		.number()
		.refine((size) => PAGE_SIZE_OPTIONS.includes(size))
		.optional()
		.catch(undefined),
	sort: z
		.string()
		.regex(/^(none|[A-Za-z][\w.]*:(asc|desc))$/)
		.optional()
		.catch(undefined),
	filters: z
		.array(z.unknown())
		.transform((items) => items.slice(0, MAX_FILTER_ITEMS))
		.optional()
		.catch(undefined),
	logic: z.enum(["and", "or"]).optional().catch(undefined),
});

export type RouteGridSearch = z.output<typeof gridSearchSchema>;
