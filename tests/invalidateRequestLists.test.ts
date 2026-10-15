import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { invalidateRequestLists } from "../src/helpers/sharedQueries";
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
