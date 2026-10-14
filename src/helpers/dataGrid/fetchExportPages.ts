/** The doctrine's bound on one request: never more than 100 rows. */
export const EXPORT_PAGE_SIZE = 100;

/**
 * The most rows one export may fetch: 100 sequential requests. A library's own requests run
 * to a few thousand a year at the scale constants, so this covers a year of any one library
 * and refuses a consortium-sized pull.
 */
export const MAX_EXPORT_ROWS = 10_000;

export class ExportTooLargeError extends Error {
	constructor(readonly totalSize: number) {
		super(`Export of ${totalSize} rows exceeds the limit of ${MAX_EXPORT_ROWS}`);
		this.name = "ExportTooLargeError";
	}
}

/** The rows changed while they were paged, or the server did not say how many there are. */
export class ExportIncompleteError extends Error {
	constructor(
		readonly fetched: number,
		readonly totalSize: number | null,
	) {
		super(`Export stopped at ${fetched} of ${totalSize ?? "an unknown number of"} rows`);
		this.name = "ExportIncompleteError";
	}
}

export interface ExportPage<Row> {
	/** Null where the service did not count: refused, never read as 0. */
	totalSize: number | null;
	content: Row[];
}

interface FetchExportPagesOptions<Row> {
	fetchPage: (pageno: number, signal?: AbortSignal) => Promise<ExportPage<Row>>;
	/** Rows it refuses never reach the caller. */
	keep: (row: Row) => boolean;
	signal?: AbortSignal;
	onProgress?: (loaded: number, total: number) => void;
}

/** One page at a time, so an export never holds more than one request open against the server. */
export const fetchExportPages = async <Row>({
	fetchPage,
	keep,
	signal,
	onProgress,
}: FetchExportPagesOptions<Row>): Promise<Row[]> => {
	const kept: Row[] = [];
	let fetched = 0;
	let total = 0;
	let pageno = 0;

	do {
		signal?.throwIfAborted();
		const page = await fetchPage(pageno, signal);
		signal?.throwIfAborted();

		if (pageno === 0) {
			if (typeof page.totalSize !== "number") throw new ExportIncompleteError(0, null);
			total = page.totalSize;
			if (total > MAX_EXPORT_ROWS) throw new ExportTooLargeError(total);
		}
		const content = page.content ?? [];
		fetched += content.length;
		kept.push(...content.filter(keep));
		onProgress?.(Math.min(fetched, total), total);

		if (content.length < EXPORT_PAGE_SIZE) {
			// Short before the count: offset pages skip rows once the result shrinks under them
			if (fetched < total) throw new ExportIncompleteError(fetched, total);
			break;
		}
		pageno++;
	} while (fetched < total && pageno * EXPORT_PAGE_SIZE < MAX_EXPORT_ROWS);

	return kept;
};
