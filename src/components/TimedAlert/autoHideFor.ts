import type { TimedAlertProps } from "../../models/TimedAlertProps";

/**
 * How long a message stays before it closes itself, in ms; null stays until dismissed.
 * Only a success closes itself: it confirms an action, and missing it loses nothing the user
 * must act on. An error or a warning says what went wrong and why, which is what somebody
 * most needs time to read (WCAG 2.2.1). Snackbar pauses the timer while hovered or focused.
 */
export function autoHideFor(severity: TimedAlertProps["severityType"]): number | null {
	return severity === "success" ? 6000 : null;
}
