import { z } from "zod";

import { MAX_PAGE, PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";

/**
 * The requesting search, in the URL. Every field `.catch()`es to absent, so a
 * hand-typed or truncated link renders the page rather than a route error, and
 * a page size is never one the grid does not offer - it becomes the search
 * request's `limit`.
 */
const pageSize = z.coerce.number().refine((size) => PAGE_SIZE_OPTIONS.includes(size));

export const requestingSearchSchema = z
	.object({
		// The router JSON-parses search values, so `?filters=12345` arrives as a number.
		filters: z
			.preprocess(
				(value) => (typeof value === "number" ? String(value) : value),
				z.string(),
			)
			.optional()
			.catch(undefined),
		// One-based, as every grid's address is: docs/url-view-state.md
		page: z.coerce.number().int().min(1).max(MAX_PAGE + 1).optional().catch(undefined),
		pageSize: pageSize.optional().catch(undefined),
		// What links written before 2.0.0 said: a zero-based page. Read, never written.
		pageno: z.coerce.number().int().min(0).max(MAX_PAGE).optional().catch(undefined),
		pagesize: pageSize.optional().catch(undefined),
	})
	.transform(({ pageno, pagesize, ...search }) => ({
		...search,
		page: search.page ?? (pageno === undefined ? undefined : pageno + 1),
		pageSize: search.pageSize ?? pagesize,
	}));

export type RequestingSearch = z.infer<typeof requestingSearchSchema>;
