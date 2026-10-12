import { z } from "zod";

import { PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";

/**
 * The requesting search, in the URL. Every field `.catch()`es to absent, so a
 * hand-typed or truncated link renders the page rather than a route error, and
 * a page size is never one the grid does not offer - it becomes the search
 * request's `limit`.
 */
export const requestingSearchSchema = z.object({
	// The router JSON-parses search values, so `?filters=12345` arrives as a number.
	filters: z
		.preprocess(
			(value) => (typeof value === "number" ? String(value) : value),
			z.string(),
		)
		.optional()
		.catch(undefined),
	pageno: z.coerce.number().int().min(0).optional().catch(undefined),
	pagesize: z.coerce
		.number()
		.refine((size) => PAGE_SIZE_OPTIONS.includes(size))
		.optional()
		.catch(undefined),
});

export type RequestingSearch = z.infer<typeof requestingSearchSchema>;
