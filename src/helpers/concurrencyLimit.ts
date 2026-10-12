/**
 * Runs at most `max` tasks at once; the rest wait in submission order. A task
 * whose signal aborts while it waits is dropped and never started.
 */
export const createConcurrencyLimit = (max: number) => {
	let running = 0;
	// Bounded by the callers: each holds at most one entry until it starts or aborts.
	const waiting: (() => void)[] = [];

	const startNext = () => {
		if (running < max) waiting.shift()?.();
	};

	return <T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> =>
		new Promise<T>((resolve, reject) => {
			if (signal?.aborted) {
				reject(signal.reason);
				return;
			}

			const onAbort = () => {
				waiting.splice(waiting.indexOf(start), 1);
				reject(signal?.reason);
			};

			const start = () => {
				signal?.removeEventListener("abort", onAbort);
				running += 1;
				Promise.resolve()
					.then(task)
					.then(resolve, reject)
					.finally(() => {
						running -= 1;
						startNext();
					});
			};

			signal?.addEventListener("abort", onAbort, { once: true });
			waiting.push(start);
			startNext();
		});
};
