import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";

import {
	LIBRARY_CODE_PARAM,
	clusterSizeDistributionQueryOptions,
	collectionOverlapQueryOptions,
	collectionProfileQueryOptions,
	collectionTotalsQueryOptions,
	dashboardMetricsQueryOptions,
	formatProfileQueryOptions,
	topPartnersQueryOptions,
	unfillableDemandQueryOptions,
} from "@helpers/statsApi";

/**
 * The library filter goes to dcb-service as `requestedLibraryCode`, never
 * `libraryCode`. The old name is SILENTLY wrong - the endpoint ignores it and
 * falls back to the token - so nothing else would catch it.
 * docs/service-compatibility.md.
 */
describe("statsApi query parameters", () => {
	const clientReturning = (): {
		client: AxiosInstance;
		sent: () => unknown;
	} => {
		let captured: unknown;

		const get = vi.fn(async (_url: string, config?: { params?: unknown }) => {
			captured = config?.params;
			return { data: [] };
		});

		return {
			client: { get } as unknown as AxiosInstance,
			sent: () => captured,
		};
	};

	it("sends the library filter under the name dcb-service binds", async () => {
		const { client, sent } = clientReturning();

		await dashboardMetricsQueryOptions(client, {
			libraryCode: "LIB_A",
		}).queryFn();

		expect(sent()).toEqual({ [LIBRARY_CODE_PARAM]: "LIB_A" });
		expect(sent()).not.toHaveProperty("libraryCode");
	});

	it("keeps that name for the endpoints that require a library", async () => {
		const { client, sent } = clientReturning();

		await topPartnersQueryOptions(client, {
			libraryCode: "LIB_A",
			startDate: "2026-01-01T00:00:00Z",
		}).queryFn();

		expect(sent()).toEqual({
			[LIBRARY_CODE_PARAM]: "LIB_A",
			startDate: "2026-01-01T00:00:00Z",
		});
	});

	it("passes paging through to top-partners untouched", async () => {
		const { client, sent } = clientReturning();

		await topPartnersQueryOptions(client, {
			libraryCode: "LIB_A",
			page: 2,
			size: 25,
		}).queryFn();

		expect(sent()).toEqual({
			[LIBRARY_CODE_PARAM]: "LIB_A",
			page: 2,
			size: 25,
		});
	});

	it("surfaces the page rather than flattening it to the first page", async () => {
		// The tail being reachable is the reason this endpoint exists over the fixed top ten
		// on dashboard-metrics; a helper that returned page zero would put it back out of
		// reach. totalSize counts PARTNERS, so it drives a page control directly.
		const get = vi.fn(async () => ({
			data: { content: [{ partnerCode: "PEER_X" }], totalSize: 37 },
		}));
		const client = { get } as unknown as AxiosInstance;

		const page = await topPartnersQueryOptions(client, {
			libraryCode: "LIB_A",
		}).queryFn();

		expect(page.totalSize).toBe(37);
		expect(page.content).toHaveLength(1);
	});

	it("still drops undefined rather than serialising it", async () => {
		const { client, sent } = clientReturning();

		await dashboardMetricsQueryOptions(client, {
			libraryCode: "LIB_A",
			startDate: undefined,
		}).queryFn();

		expect(sent()).toEqual({ [LIBRARY_CODE_PARAM]: "LIB_A" });
	});
});

describe("collection analysis queries", () => {
	const recordingClient = () => {
		let url = "";
		let params: unknown;
		const get = vi.fn(async (u: string, config?: { params?: unknown }) => {
			url = u;
			params = config?.params;
			return { data: [] };
		});
		return {
			client: { get } as unknown as AxiosInstance,
			url: () => url,
			params: () => params,
		};
	};

	const consortiumWide = [
		["collection-totals", collectionTotalsQueryOptions],
		["collection-profile", collectionProfileQueryOptions],
		["cluster-size-distribution", clusterSizeDistributionQueryOptions],
		["format-profile", formatProfileQueryOptions],
	] as const;

	it.each(consortiumWide)(
		"asks /insights/%s with no parameters and a constant key",
		async (path, factory) => {
			const { client, url, params } = recordingClient();

			await factory(client).queryFn();

			expect(url()).toBe(`/insights/${path}`);
			expect(params()).toBeUndefined();
			expect(factory(client).queryKey).toEqual(["stats", path]);
		},
	);

	it.each(consortiumWide)(
		"retries %s only while the shared count is still running",
		(_path, factory) => {
			const { client } = recordingClient();
			const { retry, retryDelay } = factory(client);
			const status = (code: number) => ({ response: { status: code } });

			expect(retry(0, status(504))).toBe(true);
			expect(retry(0, status(429))).toBe(true);
			expect(retry(3, status(502))).toBe(false);
			expect(retry(0, status(500))).toBe(false);
			expect(retry(0, status(403))).toBe(false);
			expect([0, 1, 2].map(retryDelay)).toEqual([20_000, 40_000, 60_000]);
		},
	);

	it("asks for this library's overlap under the name dcb-service binds", async () => {
		const { client, url, params } = recordingClient();

		await collectionOverlapQueryOptions(client, {
			libraryCode: "LIB_A",
		}).queryFn();

		expect(url()).toBe("/insights/collection-overlap");
		expect(params()).toEqual({ [LIBRARY_CODE_PARAM]: "LIB_A" });
	});

	it("asks for unfillable demand for this library", async () => {
		const { client, url, params } = recordingClient();

		await unfillableDemandQueryOptions(client, {
			libraryCode: "LIB_A",
		}).queryFn();

		expect(url()).toBe("/insights/unfillable-demand");
		expect(params()).toEqual({ [LIBRARY_CODE_PARAM]: "LIB_A" });
	});
});
