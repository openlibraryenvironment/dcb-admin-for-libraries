import { beforeEach, describe, expect, it } from "vitest";

import { useAnnouncer } from "@/hooks/useAnnouncer";

const ZERO_WIDTH = "​";
const announce = (message: string) => useAnnouncer.getState().announce(message);
const current = () => useAnnouncer.getState().message;

describe("useAnnouncer", () => {
	beforeEach(() => {
		useAnnouncer.setState({ message: "" });
	});

	it("carries the message", () => {
		announce("3 titles found");
		expect(current()).toBe("3 titles found");
	});

	// The one piece of real logic here. A screen reader re-reads a live region
	// when its TEXT changes, so two searches that happen to match the same number
	// would be read once and the second would pass in silence.
	it("changes the text even when the message repeats", () => {
		announce("3 titles found");
		const first = current();

		announce("3 titles found");
		const second = current();

		expect(second).not.toBe(first);
		expect(second.replace(ZERO_WIDTH, "")).toBe("3 titles found");
	});

	it("does not accumulate padding across repeats", () => {
		announce("same");
		announce("same");
		announce("same");
		expect(current().split(ZERO_WIDTH).length - 1).toBeLessThanOrEqual(1);
	});

	it("drops the padding when the message actually changes", () => {
		announce("same");
		announce("same");
		announce("different");
		expect(current()).toBe("different");
	});
});
