import { describe, expect, it, vi } from "vitest";
import { QueryCache, QueryClient, QueryObserver } from "@tanstack/react-query";

import { trackAbandonedQueries } from "@helpers/abandonedQueries";

/** A client whose cache reports what the app's would: failures not abandoned. */
const setup = () => {
	const reported: string[] = [];
	const queryCache = new QueryCache({
		onError: (error, query) => {
			if (!isAbandoned(query)) reported.push((error as Error).message);
		},
	});
	const isAbandoned = trackAbandonedQueries(queryCache);
	const client = new QueryClient({ queryCache, defaultOptions: { queries: { retry: false } } });
	return { client, reported };
};

/** A query function the test fails when it chooses. */
const pending = () => {
	let fail: (error: Error) => void = () => undefined;
	let started = false;
	const queryFn = () =>
		new Promise<never>((_, reject) => {
			started = true;
			fail = reject;
		});
	return { queryFn, fail: (message: string) => fail(new Error(message)), started: () => started };
};

describe("a failed query", () => {
	it("is reported while its page watches it", async () => {
		const { client, reported } = setup();
		const query = pending();
		const observer = new QueryObserver(client, { queryKey: ["watched"], queryFn: query.queryFn });
		const stop = observer.subscribe(() => undefined);
		await vi.waitFor(() => expect(query.started()).toBe(true));

		query.fail("network");
		await vi.waitFor(() => expect(reported).toEqual(["network"]));
		stop();
	});

	it("is not reported once the reader has left its page", async () => {
		const { client, reported } = setup();
		const query = pending();
		const observer = new QueryObserver(client, { queryKey: ["left"], queryFn: query.queryFn });
		const stop = observer.subscribe(() => undefined);
		await vi.waitFor(() => expect(query.started()).toBe(true));

		stop();
		query.fail("network");
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(reported).toEqual([]);
	});

	it("is reported for a route loader's own fetch, which nobody watches yet", async () => {
		const { client, reported } = setup();
		const left = pending();
		const observer = new QueryObserver(client, { queryKey: ["shared"], queryFn: left.queryFn });
		const stop = observer.subscribe(() => undefined);
		await vi.waitFor(() => expect(left.started()).toBe(true));
		stop();
		left.fail("old page");
		await new Promise((resolve) => setTimeout(resolve, 10));

		// The same query, fetched again by the next page's loader
		const loader = pending();
		const fetched = client.fetchQuery({ queryKey: ["shared"], queryFn: loader.queryFn, staleTime: 0 });
		await vi.waitFor(() => expect(loader.started()).toBe(true));
		loader.fail("network");
		await expect(fetched).rejects.toThrow("network");
		expect(reported).toEqual(["network"]);
	});
});
