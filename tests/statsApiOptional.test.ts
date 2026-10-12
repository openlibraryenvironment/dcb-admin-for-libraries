import { describe, expect, it } from "vitest";
import type { AxiosInstance } from "axios";

import * as statsApi from "@helpers/statsApi";
import { OPTIONAL_QUERY } from "@helpers/serviceErrors";

// Without the marker, one panel's 503 sends the whole app to /maintenance.
describe("every statistics query is optional", () => {
	type Factory = (client: AxiosInstance, params: object) => { meta?: unknown };

	const factories = Object.entries(statsApi as Record<string, unknown>).filter(
		(entry): entry is [string, Factory] =>
			entry[0].endsWith("QueryOptions") && typeof entry[1] === "function",
	);

	it("finds the factories it is meant to be checking", () => {
		expect(factories.length).toBeGreaterThanOrEqual(30);
	});

	it.each(factories)("%s carries OPTIONAL_QUERY", (_name, factory) => {
		expect(factory({} as AxiosInstance, {}).meta).toEqual(OPTIONAL_QUERY);
	});
});
