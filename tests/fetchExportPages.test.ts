import { describe, expect, it, vi } from "vitest";
import {
	EXPORT_PAGE_SIZE,
	ExportIncompleteError,
	ExportTooLargeError,
	MAX_EXPORT_ROWS,
	fetchExportPages,
} from "@helpers/dataGrid/fetchExportPages";

const pageOf = (total: number) => (pageno: number) =>
	Promise.resolve({
		totalSize: total,
		content: Array.from(
			{ length: Math.max(0, Math.min(EXPORT_PAGE_SIZE, total - pageno * EXPORT_PAGE_SIZE)) },
			(_, i) => ({ id: `r${pageno * EXPORT_PAGE_SIZE + i}` }),
		),
	});

describe("fetchExportPages", () => {
	it("asks for at most 100 rows a request, one request at a time", async () => {
		expect(EXPORT_PAGE_SIZE).toBeLessThanOrEqual(100);
		let inFlight = 0;
		let most = 0;
		const fetchPage = vi.fn(async (pageno: number) => {
			inFlight++;
			most = Math.max(most, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 1));
			inFlight--;
			return pageOf(250)(pageno);
		});
		const rows = await fetchExportPages({ fetchPage, keep: () => true });
		expect(rows).toHaveLength(250);
		expect(fetchPage.mock.calls.map(([pageno]) => pageno)).toEqual([0, 1, 2]);
		expect(most).toBe(1);
	});

	it("refuses an export over the cap before fetching past the first page", async () => {
		const fetchPage = vi.fn(pageOf(MAX_EXPORT_ROWS + 1));
		await expect(
			fetchExportPages({ fetchPage, keep: () => true }),
		).rejects.toBeInstanceOf(ExportTooLargeError);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("allows an export of exactly the cap", async () => {
		const fetchPage = vi.fn(pageOf(MAX_EXPORT_ROWS));
		const rows = await fetchExportPages({ fetchPage, keep: () => true });
		expect(rows).toHaveLength(MAX_EXPORT_ROWS);
	});

	it("drops every row the predicate refuses, on every page", async () => {
		const rows = await fetchExportPages({
			fetchPage: pageOf(250),
			keep: (row: { id: string }) => Number(row.id.slice(1)) % 2 === 0,
		});
		expect(rows).toHaveLength(125);
	});

	it("stops when cancelled, and asks for nothing more", async () => {
		const controller = new AbortController();
		const fetchPage = vi.fn(async (pageno: number) => {
			if (pageno === 1) controller.abort();
			return pageOf(1000)(pageno);
		});
		await expect(
			fetchExportPages({ fetchPage, keep: () => true, signal: controller.signal }),
		).rejects.toThrow(/abort/i);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	it("reports progress against the server's total", async () => {
		const progress: [number, number][] = [];
		await fetchExportPages({
			fetchPage: pageOf(250),
			keep: () => true,
			onProgress: (loaded, total) => progress.push([loaded, total]),
		});
		expect(progress).toEqual([
			[100, 250],
			[200, 250],
			[250, 250],
		]);
	});

	it("refuses a first page that says nothing of the total, rather than export one page of it", async () => {
		const fetchPage = vi.fn(async () => ({
			totalSize: null,
			content: Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => ({ id: `r${i}` })),
		}));
		await expect(
			fetchExportPages({ fetchPage: fetchPage as never, keep: () => true }),
		).rejects.toBeInstanceOf(ExportIncompleteError);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("refuses a page that comes back short before the total: rows moved while it paged", async () => {
		const fetchPage = vi.fn(async (pageno: number) => ({
			totalSize: 250,
			content: Array.from({ length: pageno === 0 ? EXPORT_PAGE_SIZE : 40 }, (_, i) => ({
				id: `r${pageno}-${i}`,
			})),
		}));
		await expect(fetchExportPages({ fetchPage, keep: () => true })).rejects.toBeInstanceOf(
			ExportIncompleteError,
		);
	});

	it("finishes on a short last page that reaches the total", async () => {
		const rows = await fetchExportPages({ fetchPage: pageOf(140), keep: () => true });
		expect(rows).toHaveLength(140);
	});
});
