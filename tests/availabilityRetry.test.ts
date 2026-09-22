import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import {
	AVAILABILITY_QUERY_POLICY,
	availabilityRetryDelay,
	isClientError,
	retryAvailability,
} from "../src/constants/availability";

const axiosError = (status?: number): AxiosError => {
	const error = new AxiosError("failed");
	if (status !== undefined) {
		error.response = {
			status,
			statusText: "",
			data: null,
			headers: {},
			config: { headers: new AxiosHeaders() },
		};
	}
	return error;
};

/**
 * One call here becomes one outbound call per member LMS. TanStack Query's
 * default is three retries on everything, so a 404 was four fan-outs to tens of
 * third-party systems.
 */
describe("the availability retry policy", () => {
	it("never retries a 4xx", () => {
		for (const status of [400, 401, 403, 404, 422, 499]) {
			expect(retryAvailability(0, axiosError(status)), String(status)).toBe(
				false,
			);
		}
	});

	it("retries a server error, but only twice", () => {
		expect(retryAvailability(0, axiosError(500))).toBe(true);
		expect(retryAvailability(1, axiosError(503))).toBe(true);
		expect(retryAvailability(2, axiosError(503))).toBe(false);
	});

	it("retries a network failure, which has no response at all", () => {
		expect(isClientError(axiosError(undefined))).toBe(false);
		expect(retryAvailability(0, axiosError(undefined))).toBe(true);
		expect(retryAvailability(0, new Error("offline"))).toBe(true);
	});

	/**
	 * Every card on a results page runs its own copy of this query. A fixed
	 * delay brings them all back to a struggling LMS at the same instant.
	 */
	it("backs off, and never at a fixed short delay", () => {
		const first = availabilityRetryDelay(0);
		const second = availabilityRetryDelay(1);
		expect(first).toBeGreaterThanOrEqual(2000);
		expect(first).toBeLessThan(3000);
		expect(second).toBeGreaterThanOrEqual(4000);
		expect(second).toBeLessThan(5000);
		expect(availabilityRetryDelay(10)).toBeLessThanOrEqual(16000);
	});

	it("is jittered, so the retries do not arrive together", () => {
		const delays = new Set(
			Array.from({ length: 20 }, () => availabilityRetryDelay(0)),
		);
		expect(delays.size).toBeGreaterThan(1);
	});

	it("does not call every member LMS again on window focus", () => {
		expect(AVAILABILITY_QUERY_POLICY.refetchOnWindowFocus).toBe(false);
		expect(AVAILABILITY_QUERY_POLICY.staleTime).toBeGreaterThan(0);
	});
});

/**
 * The policy is only worth having if nothing reaches the endpoint without it.
 * ExpeditedCheckout is excluded by name: it calls axios directly, which does
 * not retry, and its comment says so.
 */
describe("every availability query carries the policy", () => {
	const MANUAL = "src/forms/ExpeditedCheckout/ExpeditedCheckout.tsx";

	const sources = (dir: string): string[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
			const path = join(dir, entry.name).replaceAll("\\", "/");
			if (entry.isDirectory()) return sources(path);
			return /\.tsx?$/.test(entry.name) ? [path] : [];
		});

	const callers = sources("src").filter(
		(file) =>
			file !== "src/constants/availability.ts" &&
			readFileSync(file, "utf8").includes("/items/availability"),
	);

	it("finds the call sites, so it cannot pass vacuously", () => {
		expect(callers.length).toBeGreaterThanOrEqual(4);
		expect(callers).toContain(MANUAL);
	});

	it("spreads AVAILABILITY_QUERY_POLICY into each useQuery that hits it", () => {
		const missing = callers.filter(
			(file) =>
				file !== MANUAL &&
				!readFileSync(file, "utf8").includes("...AVAILABILITY_QUERY_POLICY"),
		);
		expect(missing).toEqual([]);
	});
});
