/**
 * The bound the doctrine puts on a single UI interaction: never more than 100
 * rows, always paged. One list, so the grid, the persisted preference and the
 * server request cannot disagree about it.
 */
export const MAX_PAGE_SIZE = 100;

export const PAGE_SIZE_OPTIONS: number[] = [5, 10, 20, 25, 30, 40, 50, 100];

export const DEFAULT_PAGE_SIZE = 25;

/**
 * A page size from storage or from a hand-typed URL, brought back inside the
 * list. An unrecognised size is not an error the user can act on: it is a value
 * an older build wrote, or one they never chose.
 */
export const clampPageSize = (pageSize: unknown): number =>
	typeof pageSize === "number" && PAGE_SIZE_OPTIONS.includes(pageSize)
		? pageSize
		: DEFAULT_PAGE_SIZE;

/**
 * For a bounded REFERENCE list fetched whole to fill a picker or a filter's
 * options - the member libraries, not a page of results. The scale constants
 * put member libraries in the hundreds, so this has headroom over 500 and is
 * still a number rather than "as many as there are". Ten thousand and one
 * hundred thousand were both in use for the same list.
 */
export const REFERENCE_LIST_PAGE_SIZE = 1000;
