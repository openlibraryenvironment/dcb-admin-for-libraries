import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";

import {
	LIBRARY_CODE_PARAM,
	dashboardMetricsQueryOptions,
	topPartnersQueryOptions,
} from "@helpers/statsApi";

/**
 * The library filter goes to dcb-service as `requestedLibraryCode`, never `libraryCode`.
 *
 * StatsScopeGuard treats it as a REQUEST checked against the caller's token rather than an
 * instruction, and dcb-service's own StatsScopeArchitectureTests fails the build if an endpoint
 * goes back to binding the trusted name. Sending the old name from here is silently wrong
 * rather than an error - the endpoint ignores it, and a consortium administrator asking for one
 * library gets consortium-wide figures rendered under that library's name.
 *
 * Nothing else would catch that: every library-scoped caller gets the right answer anyway,
 * because the guard falls back to their token.
 */
describe("statsApi query parameters", () => {
	const clientReturning = (): { client: AxiosInstance; sent: () => unknown } => {
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

		await dashboardMetricsQueryOptions(client, { libraryCode: "LIB_A" }).queryFn();

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
