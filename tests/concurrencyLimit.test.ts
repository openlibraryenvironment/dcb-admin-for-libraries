import { describe, expect, it } from "vitest";

import { createConcurrencyLimit } from "../src/helpers/concurrencyLimit";

interface Deferred {
	promise: Promise<string>;
	resolve: (value: string) => void;
	reject: (reason: unknown) => void;
}

const deferred = (): Deferred => {
	let resolve!: (value: string) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<string>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createConcurrencyLimit", () => {
	it("never runs more than the limit at once, and runs the rest in order", async () => {
		const limit = createConcurrencyLimit(4);
		const tasks = Array.from({ length: 10 }, deferred);
		const started: number[] = [];
		let running = 0;
		let peak = 0;

		const results = tasks.map((task, index) =>
			limit(async () => {
				started.push(index);
				running += 1;
				peak = Math.max(peak, running);
				try {
					return await task.promise;
				} finally {
					running -= 1;
				}
			}),
		);

		await flush();
		expect(started).toEqual([0, 1, 2, 3]);

		tasks[1].resolve("one");
		await flush();
		expect(started).toEqual([0, 1, 2, 3, 4]);

		tasks.forEach((task, index) => task.resolve(String(index)));
		await expect(Promise.all(results)).resolves.toHaveLength(10);
		expect(started).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(peak).toBe(4);
	});

	it("frees the slot of a task that fails", async () => {
		const limit = createConcurrencyLimit(1);
		const failing = deferred();
		const first = limit(() => failing.promise);
		const second = limit(async () => "second");

		failing.reject(new Error("LMS down"));

		await expect(first).rejects.toThrow("LMS down");
		await expect(second).resolves.toBe("second");
	});

	it("frees the slot of a task that throws before returning a promise", async () => {
		const limit = createConcurrencyLimit(1);
		const first = limit((): Promise<string> => {
			throw new Error("synchronous");
		});

		await expect(first).rejects.toThrow("synchronous");
		await expect(limit(async () => "next")).resolves.toBe("next");
	});

	it("never starts a queued task whose signal aborts while it waits", async () => {
		const limit = createConcurrencyLimit(1);
		const blocker = deferred();
		const controller = new AbortController();
		let started = false;

		void limit(() => blocker.promise);
		const queued = limit(async () => {
			started = true;
			return "queued";
		}, controller.signal);

		controller.abort(new Error("card unmounted"));
		await expect(queued).rejects.toThrow("card unmounted");

		blocker.resolve("done");
		await flush();
		expect(started).toBe(false);
		await expect(limit(async () => "after")).resolves.toBe("after");
	});

	it("does not start a task whose signal has already aborted", async () => {
		const limit = createConcurrencyLimit(1);
		const controller = new AbortController();
		controller.abort(new Error("gone"));
		let started = false;

		await expect(
			limit(async () => {
				started = true;
				return "never";
			}, controller.signal),
		).rejects.toThrow("gone");
		expect(started).toBe(false);
	});
});
