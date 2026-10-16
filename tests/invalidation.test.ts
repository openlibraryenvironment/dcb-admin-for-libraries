import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { invalidateLibrary, invalidateRequestLists } from "../src/helpers/sharedQueries";
import { gridPage, queryKeys } from "../src/helpers/queryKeys";

/**
 * A placed request must appear in the grids, which otherwise serve their cached page
 * for the five minutes of the default staleTime. Staff took its absence for a failed
 * placement and placed it again.
 */
describe("invalidateRequestLists", () => {
	const page = gridPage({ items: [] }, { page: 0, pageSize: 25 }, []);

	it("makes every request grid fetch again, and nothing else", async () => {
		const client = new QueryClient();
		const borrowed = queryKeys.patronRequests.list("api", { agencyCode: "lib" }, page);
		const history = queryKeys.patronRequests.list(
			"api",
			{ agencyCode: "lib", mode: "borrowing", additionalQuery: "(bibClusterId:x)" },
			page,
		);
		const supplied = queryKeys.supplierRequests.list("api", "lib", page);
		const unrelated = queryKeys.libraries.all("api");
		for (const key of [borrowed, history, supplied, unrelated]) {
			client.setQueryData(key, { ok: true });
		}

		await invalidateRequestLists(client);

		const stale = (key: readonly unknown[]) =>
			client.getQueryState(key)?.isInvalidated ?? false;
		expect([borrowed, history, supplied].map(stale)).toEqual([true, true, true]);
		expect(stale(unrelated)).toBe(false);
	});
});

describe("a request's audit log", () => {
	it("is invalidated, every page of it, by the request-wide key", async () => {
		const client = new QueryClient();
		const pages = [0, 1].map((n) =>
			queryKeys.audits.forPatronRequest(
				"api",
				"pr-1",
				gridPage({ items: [] }, { page: n, pageSize: 25 }, []),
			),
		);
		const other = queryKeys.audits.forPatronRequest(
			"api",
			"pr-2",
			gridPage({ items: [] }, { page: 0, pageSize: 25 }, []),
		);
		for (const key of [...pages, other]) client.setQueryData(key, { ok: true });

		await client.invalidateQueries({
			queryKey: queryKeys.audits.forPatronRequestAll("api", "pr-1"),
		});

		const stale = (key: readonly unknown[]) =>
			client.getQueryState(key)?.isInvalidated ?? false;
		expect(pages.map(stale)).toEqual([true, true]);
		expect(stale(other)).toBe(false);
	});
});

describe("invalidateLibrary", () => {
	it("refreshes everywhere the library's name is shown, and leaves other libraries", async () => {
		const client = new QueryClient();
		const ours = [
			queryKeys.library.detail("api", "lib"),
			queryKeys.library.own("api", "lib"),
			queryKeys.library.basics("api", "lib"),
			queryKeys.library.name("api", "lib"),
			queryKeys.library.names("api", ["lib", "other"]),
			queryKeys.libraries.all("api"),
			queryKeys.libraries.filterOptions("api"),
		];
		const theirs = [
			queryKeys.library.name("api", "other"),
			queryKeys.library.names("api", ["other"]),
		];
		for (const key of [...ours, ...theirs]) client.setQueryData(key, { ok: true });

		await invalidateLibrary(client, "api", "lib");

		const stale = (key: readonly unknown[]) =>
			client.getQueryState(key)?.isInvalidated ?? false;
		expect(ours.map(stale)).toEqual(ours.map(() => true));
		expect(theirs.map(stale)).toEqual([false, false]);
	});
});
