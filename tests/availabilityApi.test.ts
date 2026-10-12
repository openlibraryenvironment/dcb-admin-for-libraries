import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	AVAILABILITY_QUERY_POLICY,
	retryAvailability,
} from "../src/constants/availability";
import {
	availabilityKeys,
	availabilityQueryOptions,
} from "../src/helpers/availabilityApi";

const API = "https://dcb.example.org";
const CLUSTER = "aaaaaaaa-0000-4000-8000-000000000001";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("availabilityKeys", () => {
	it("keys a cluster on the API, the record and the filter, and nothing about the caller", () => {
		expect(availabilityKeys.cluster(API, CLUSTER)).toEqual([
			"availability",
			API,
			CLUSTER,
			"default",
		]);
		expect(availabilityKeys.cluster(API, CLUSTER, "none")).toEqual([
			"availability",
			API,
			CLUSTER,
			"none",
		]);
	});
});

describe("availabilityQueryOptions", () => {
	it("carries the availability query policy", () => {
		const options = availabilityQueryOptions(API, CLUSTER);
		expect(options.retry).toBe(retryAvailability);
		expect(options.staleTime).toBe(AVAILABILITY_QUERY_POLICY.staleTime);
		expect(options.refetchOnWindowFocus).toBe(false);
	});

	it("passes the query's AbortSignal, the filter, and no credentials", async () => {
		const get = vi
			.spyOn(axios, "get")
			.mockResolvedValue({ data: { itemList: [] } });
		const { signal } = new AbortController();
		const options = availabilityQueryOptions(API, CLUSTER, "none");

		await expect(
			options.queryFn?.({ signal, queryKey: options.queryKey } as never),
		).resolves.toEqual({ itemList: [] });

		expect(get).toHaveBeenCalledTimes(1);
		const [url, config] = get.mock.calls[0];
		expect(url).toBe(`${API}/items/availability`);
		expect(config?.signal).toBe(signal);
		expect(config?.params).toEqual({ clusteredBibId: CLUSTER, filters: "none" });
		expect(config?.headers).toBeUndefined();
	});
});
