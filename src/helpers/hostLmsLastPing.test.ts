import { describe, expect, it } from "vitest";
import { lastPingView } from "./hostLmsLastPing";

describe("a library system's last connection check", () => {
	it("reads dcb-service 9.2.0's record", () => {
		expect(
			lastPingView({ status: "OK", checkedAt: "2026-10-26T10:00:00Z", lastOkAt: "2026-10-26T10:00:00Z", pingMillis: 120 }),
		).toEqual({ state: "ok", severity: "success", checkedAt: "2026-10-26T10:00:00Z", lastOkAt: "2026-10-26T10:00:00Z" });
		expect(lastPingView({ status: "ERROR", failure: "REFUSED", checkedAt: "2026-10-26T10:00:00Z" })).toMatchObject({
			state: "refused",
			severity: "error",
			lastOkAt: null,
		});
		expect(lastPingView({ status: "ERROR", failure: "UNREACHABLE" })?.severity).toBe("warning");
		expect(lastPingView({ status: "ERROR", failure: "SOMETHING_NEW" })?.state).toBe("unknown");
	});

	it("has nothing to show for a system never checked, or not the library's to see", () => {
		expect(lastPingView(null)).toBeNull();
		expect(lastPingView(undefined)).toBeNull();
		// What dcb-service answers anyone but the system's own libraries' administrators
		expect(lastPingView({})).toBeNull();
		expect(lastPingView("OK")).toBeNull();
	});
});
