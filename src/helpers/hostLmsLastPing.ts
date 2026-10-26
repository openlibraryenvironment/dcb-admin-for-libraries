// The same reading as DCB Admin's helpers/hostLmsLastPing.ts, of dcb-service 9.2.0's
// HostLmsPingService.lastPingFrom: status OK or ERROR, and a failure only on ERROR.

export type LastPingState = "ok" | "refused" | "misconfigured" | "unreachable" | "failing" | "unknown";

export interface LastPingView {
	state: LastPingState;
	severity: "success" | "warning" | "error";
	checkedAt: string | null;
	lastOkAt: string | null;
}

const FAILURES: Record<string, LastPingState> = {
	REFUSED: "refused",
	MISCONFIGURED: "misconfigured",
	UNREACHABLE: "unreachable",
	FAILING: "failing",
};

// REFUSED and MISCONFIGURED are what dcb-service's supplier preflight rules a library out on
const SEVERITY: Record<LastPingState, LastPingView["severity"]> = {
	ok: "success",
	refused: "error",
	misconfigured: "error",
	unreachable: "warning",
	failing: "warning",
	unknown: "warning",
};

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/**
 * Null when there is no check to show: never checked, or not this library's to see - dcb-service
 * answers `{}` to anyone but the system's own libraries' administrators.
 */
export const lastPingView = (lastPing: unknown): LastPingView | null => {
	if (lastPing == null || typeof lastPing !== "object") return null;
	const record = lastPing as Record<string, unknown>;
	if (record.status == null) return null;

	const state: LastPingState =
		record.status === "OK" ? "ok" : (FAILURES[String(record.failure)] ?? "unknown");
	return {
		state,
		severity: SEVERITY[state],
		checkedAt: text(record.checkedAt),
		lastOkAt: text(record.lastOkAt),
	};
};
