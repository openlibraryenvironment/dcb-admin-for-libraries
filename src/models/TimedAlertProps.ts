export interface TimedAlertProps {
	open: boolean;
	severityType: "success" | "info" | "warning" | "error";
	onCloseFunc: any;
	/** Optional: an error ignores it and stays until dismissed. See TimedAlert. */
	autoHideDuration?: number;
	alertTitle?: string;
	alertText: any;
}
