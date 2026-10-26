import { z } from "zod/mini";

import { MAX_PAGE, PAGE_SIZE_OPTIONS } from "@constants/dataGrid/pagination";

/**
 * The requesting search, in the URL. Every field `.catch()`es to absent, so a
 * hand-typed or truncated link renders the page rather than a route error, and
 * a page size is never one the grid does not offer - it becomes the search
 * request's `limit`.
 */
const pageSize = z.coerce.number().check(z.refine((size) => PAGE_SIZE_OPTIONS.includes(size)));

const wholePage = (min: number, max: number) =>
	z.catch(z.optional(z.coerce.number().check(z.multipleOf(1), z.minimum(min), z.maximum(max))), undefined);

export const requestingSearchSchema = z.pipe(
	z.object({
		// The router JSON-parses search values, so `?filters=12345` arrives as a number.
		filters: z.catch(
			z.optional(
				z.pipe(
					z.transform((value: unknown) => (typeof value === "number" ? String(value) : value)),
					z.string(),
				),
			),
			undefined,
		),
		// One-based, as every grid's address is: docs/url-view-state.md
		page: wholePage(1, MAX_PAGE + 1),
		pageSize: z.catch(z.optional(pageSize), undefined),
		// What links written before 2.0.0 said: a zero-based page. Read, never written.
		pageno: wholePage(0, MAX_PAGE),
		pagesize: z.catch(z.optional(pageSize), undefined),
	}),
	z.transform(({ pageno, pagesize, ...search }) => ({
		...search,
		page: search.page ?? (pageno === undefined ? undefined : pageno + 1),
		pageSize: search.pageSize ?? pagesize,
	})),
);

export type RequestingSearch = z.infer<typeof requestingSearchSchema>;
