interface FailedCheck {
	code?: string;
	description?: string;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * The message for a refused place-request. `failedChecks` is absent whenever the
 * refusal is not a rule failure - a 500, a timeout, a network error - and that
 * case must still say something.
 */
export function getRequestError(
	failedChecks: FailedCheck[] | null | undefined,
	t: Translate,
): string {
	const first = failedChecks?.[0];
	if (first?.code === "DUPLICATE_REQUEST_ATTEMPT") {
		return t("requesting.staff_request.patron.error.request.duplicate");
	}
	if (first?.code === "SUPPLIER_CANNOT_SUPPLY") {
		return t("requesting.staff_request.patron.error.request.supplier_cannot_supply", {
			description: first.description ?? "",
		});
	}
	if (first?.code === "PREFLIGHT_CHECKS_TIMED_OUT") {
		return t("requesting.staff_request.patron.error.request.timed_out");
	}
	if (first?.code) {
		return t("requesting.staff_request.patron.error.request.generic", {
			code: first.code,
			description: first.description ?? "",
		});
	}
	return t("requesting.staff_request.patron.error.request.failed");
}
